public without sharing class controladorGeneracionPedidos {

    private static final String ESTATUS_ACTIVO = 'Activo'; 
    private static final String ESTATUS_VERIFICANDO = 'Verificando Disponibilidad'; 

    public class Ordenes_Line_Item{
        @AuraEnabled
        public Id insumoId;
        @AuraEnabled
        public Integer CantidadSolicitada;
    }

    public class Orden{
        @AuraEnabled
        public Id Idcontacto;
        @AuraEnabled
        public Id IdUmu;
        @AuraEnabled
        public String TipoDePedido;
        @AuraEnabled
        public Date fechaMaxima;
        @AuraEnabled
        public Boolean esPrograma;
        @AuraEnabled
        public String numeroOficio;
        @AuraEnabled
        public String justificacion;
        @AuraEnabled
        public List<Ordenes_Line_Item> ordenesDetails;
    }

    @AuraEnabled
    public static List<Order__c> deserializeOrders(String payload){
        List<Orden> orders = (List<Orden>)JSON.deserialize(payload, List<Orden>.class);
        system.debug('Orden: ' + orders);
        List<Order__c> orderCreated = createOrders(orders);
        return orderCreated;
    }
    
    public static List<Order__c> createOrders(List<Orden> orders){
        // Insert all order line items 
        String contactId = '';
        String tipoDePedido = '';
        Boolean esPrograma = false;
        Datetime fechaMaxima = null;
        String numeroDeOficio = '';
        String justificacion = '';

        List<Order_Line_Item__c> orderLineItemsList = new List<Order_Line_Item__c>();
        for(Orden order : orders) {
            if(String.isBlank(contactId)){ contactId = order.Idcontacto; }
            if(String.isBlank(tipoDePedido)){ tipoDePedido = order.TipoDePedido; }  
            if(order.numeroOficio != null && String.isBlank(numeroDeOficio)){ numeroDeOficio = order.numeroOficio; }  
            if(order.justificacion != null && String.isBlank(justificacion)){ justificacion = order.justificacion; }
            if(!esPrograma && fechaMaxima == null && order.esPrograma != null && order.esPrograma) {
                if(order.TipoDePedido == 'Emergencia Sanitaria' || order.TipoDePedido == 'Programa') {
                    fechaMaxima = order.fechaMaxima;
                }
                esPrograma = order.esPrograma;
            } 

            for(Ordenes_Line_Item ordenes: order.ordenesDetails){
                Order_Line_Item__c ordenItem = new Order_Line_Item__c(
                    Product__c = ordenes.insumoId,
                    Cantidad_Solicitada__c = ordenes.CantidadSolicitada, 
                    UMU__c = order.IdUmu,
                    L_mite_Mensual_DPN__c = getInfoClavesDPNActiva(order.IdUmu, ordenes.insumoId, true),
                    Consumido_DPN__c = getInfoClavesDPNActiva(order.IdUmu, ordenes.insumoId, false)
                );
                orderLineItemsList.add(ordenItem);
            }
        }

        try {
            insert orderLineItemsList;
        } catch (DmlException e) {
            System.debug('An error occurred during the insert operation: ' + e.getMessage());
            return null;
        }

        // Get the inserted olis with all the required information
        Set<Id> oliIdsSet = new Set<Id>();
        for(Order_Line_Item__c oli : orderLineItemsList) {
            oliIdsSet.add(oli.Id);
        }
        List<Order_Line_Item__c> queriedOLIList = [
            SELECT Id, Name, Order__c, UMU__c, Pedido__c, Numero_de_Subalmacen__c, Order_Line_Item_Classification__c 
            FROM Order_Line_Item__c 
            WHERE Id IN: oliIdsSet
        ];
        if(queriedOLIList.isEmpty()){ return null; }

        // Set umu-id - order line item & classification maps
        Map<Id, List<Order_Line_Item__c>> olisByUmuIdMap = new Map<Id, List<Order_Line_Item__c>>();
        Map<Id, Set<Integer>> umuIdsBySubalmacenMap = new Map<Id, Set<Integer>>();
        for(Order_Line_Item__c oli : queriedOLIList){
            if(!olisByUmuIdMap.containsKey(oli.UMU__c)){
                olisByUmuIdMap.put(oli.UMU__c, new List<Order_Line_Item__c>());
            }
            olisByUmuIdMap.get(oli.UMU__c).add(oli);

            if(!umuIdsBySubalmacenMap.containsKey(oli.UMU__c)){
                umuIdsBySubalmacenMap.put(oli.UMU__c, new Set<Integer>());
            }
            umuIdsBySubalmacenMap.get(oli.UMU__c).add(Integer.valueOf(oli.Numero_de_Subalmacen__c));
        }

        List<Pedido__c> pedidoListToInsert = new List<Pedido__c>();
        for(Id umuId : olisByUmuIdMap.keySet()){
            Pedido__c pedidoRec = new Pedido__c(
                UMU__c = umuId,
                Tipo_de_Pedido__c = tipoDePedido,
                Fecha_Limite_de_Entrega__c = getFechaMaximaDeEntrega(esPrograma, tipoDePedido, umuId)
            );
            pedidoListToInsert.add(pedidoRec);
        } 
        try {
            insert pedidoListToInsert;
        } catch (DmlException e) {
            System.debug('An error occurred during the insert operation: ' + e.getMessage());
            return null;
        }

        List<Order_Line_Item__c> oliPedidoListToUpdate = new List<Order_Line_Item__c>();
        for(Pedido__c pedido : pedidoListToInsert){ 
            for(Order_Line_Item__c oli : olisByUmuIdMap.get(pedido.UMU__c)){
                oli.Pedido__c = pedido.Id;
                oliPedidoListToUpdate.add(oli);
            } 
        }
        try {
            update oliPedidoListToUpdate;
        } catch (DmlException e) {
            System.debug('An error occurred during the insert operation: ' + e.getMessage());
            return null;
        }

        // Insert sorted order list
        List<Order__c> orderListToInsert = new List<Order__c>();
        for(Id umuId : umuIdsBySubalmacenMap.keySet()){
            if(umuId == null){
                continue;
            }

            for(Integer sub : umuIdsBySubalmacenMap.get(umuId)){
                Order__c orderRec = new Order__c(
                    Contacto__c = contactId,
                    Order_Number__c = String.valueOf(sub),
                    UMU__c = umuId,
                    Tipo_de_Pedido__c = tipoDePedido,
                    Estatus__c = ESTATUS_VERIFICANDO,
                    ltima_Fecha_de_Validaci_n_de_DPN_Activa__c = getUltimaFechaActivaDPN(umuId, true),
                    Pr_ximaFecha_de_Validaci_n_de_DPN_Activa__c = getUltimaFechaActivaDPN(umuId, false)
                );
                if(esPrograma) {
                    if(tipoDePedido == 'Emergencia Sanitaria' || tipoDePedido == 'Programa') {
                        orderRec.Fecha_Limite_de_Entrega__c = fechaMaxima;
                    }
                    orderRec.Es_Programa__c = esPrograma;
                } else {
                    if(tipoDePedido != 'Ordinario'){
                        orderRec.Numero_de_Oficio__c = numeroDeOficio;
                        orderRec.Motivo__c = justificacion;
                    }
                }  
                orderListToInsert.add(orderRec);
            }
        }

        try {
            insert orderListToInsert;
        } catch (DmlException e) {
            System.debug('An error occurred during the insert operation: ' + e.getMessage());
            return null;
        }

        // Get the inserted orders with all the required information (folio)
        Set<Id> orderIdsSet = new Set<Id>();
        for(Order__c ord : orderListToInsert) {
            orderIdsSet.add(ord.Id);
        }
        List<Order__c> queriedOrderList = [
            SELECT Id, Name, UMU__c, Pedido__c, Order_Number__c, Folio_del_Pedido__c
            FROM Order__c 
            WHERE Id IN: orderIdsSet
        ];

        // Match inserted order line items with their respective classified order 
        Map<Id, Order__c> updateOrderMap = new Map<Id, Order__c>();
        List<Order_Line_Item__c> oliListToUpdate = new List<Order_Line_Item__c>(); 
        for(Order_Line_Item__c oli : queriedOLIList){ 
            for(Order__c ord : queriedOrderList){
                if(ord.UMU__c == oli.UMU__c && Integer.valueOf(ord.Order_Number__c) == Integer.valueOf(oli.Numero_de_Subalmacen__c)){
                    oli.Order__c = ord.Id;
                    oliListToUpdate.add(oli);
                } 

                if(!updateOrderMap.containsKey(ord.Id)){
                    if(ord.Pedido__c == null && oli.Pedido__c != null){ ord.Pedido__c = oli.Pedido__c; }
                    updateOrderMap.put(ord.Id, ord);
                }
            } 
        } 

        try {
            update updateOrderMap.values();
        } catch (DmlException e) {
            System.debug('An error occurred during the update operation: ' + e.getMessage());
            return null;
        } 

        try {
            update oliListToUpdate;
        } catch (DmlException e) {
            System.debug('An error occurred during the update operation: ' + e.getMessage());
            return null;
        } 

        List<Order__c> orderListToUpdate = new List<Order__c>();
        // Map<Id, Pedido__c> updatePedidoMap = new Map<Id, Pedido__c>();        
        for(Order__c ord : queriedOrderList){
            // if(!updatePedidoMap.containsKey(ord.Pedido__c)){
            //     Pedido__c pedido = new Pedido__c();
            //     pedido.Id = ord.Pedido__c;
            // }
            if(ord.Order_Number__c != null && ord.Folio_del_Pedido__c != null){ 
                ord.Order_Number__c = ord.Order_Number__c + '-' + ord.Folio_del_Pedido__c; 
                orderListToUpdate.add(ord);
            }
        }
        try {
            update orderListToUpdate;
        } catch (DmlException e) {
            System.debug('An error occurred during the update operation: ' + e.getMessage());
            return null;
        } 

        return orderListToInsert;
    }

    public static Datetime getFechaMaximaDeEntrega(Boolean esPrograma, String tipoDePedido, Id umuId){

        Datetime currentDateTime = Datetime.now();
        Datetime fechaMaxEntrega = null;

        Boolean esProgramaEmergenciaSanitaria = false;
        if(esPrograma && (tipoDePedido == 'Programa' || tipoDePedido == 'Emergencia Sanitaria')){
            esProgramaEmergenciaSanitaria = true;
        }

        if(esProgramaEmergenciaSanitaria){ return null; }

  
        Boolean isRestoDelPais = true;

        List<Account> umuList = [
            SELECT Id, Name, Estado__c
            FROM Account
            WHERE Id =: umuId
            LIMIT 1
        ];

        if(umuList.isEmpty()){ return null; }
        Account umu = umuList[0];

        String estado = umu.Estado__c;
        if (estado != null) {
            estado = estado.toLowerCase().replaceAll('[àáâäãåā]', 'a').replaceAll('[èéêëēėę]', 'e').replaceAll('[ìíîïī]', 'i').replaceAll('[òóôöõøō]', 'o').replaceAll('[ùúûüū]', 'u').replaceAll('[çč]', 'c').replaceAll('[ñ]', 'n').toUpperCase();
            System.debug(estado);
            if (estado == 'CIUDAD DE MEXICO' || estado == 'ESTADO DE MEXICO') {
                isRestoDelPais = false;
            }
        } 

        if(tipoDePedido == 'Urgencia Médica'){
            // Get fecha max | CDMX + EdoMex = 12hr | Resto = 24 hrs
            Datetime dateTimeLimiteDeEntrega = currentDateTime;
            if(isRestoDelPais){
                dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(24);
            } else{
                dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(12);
            }
            return dateTimeLimiteDeEntrega;
        } 

        else if(tipoDePedido == 'Soporte de Vida'){
            // Get fecha max | CDMX + EdoMex = 4hr | Resto = 8hrs
            Datetime dateTimeLimiteDeEntrega = currentDateTime;
            if(isRestoDelPais){
                dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(8);
            } else{
                dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(4);
            }
            return dateTimeLimiteDeEntrega;
        }

        else if(tipoDePedido == 'Extraordinario'){
            // Get fecha max de pedido ordinario relacionado 
            List<Pedido__c> pedidoOrdinario = [
                SELECT Id, UMU__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, CreatedDate
                FROM Pedido__c
                WHERE Tipo_de_Pedido__c = 'Ordinario' 
                    AND Fecha_Limite_de_Entrega__c >=: currentDateTime
                    AND UMU__c =: umuId
                ORDER BY Fecha_Limite_de_Entrega__c DESC
                LIMIT 1
            ]; 

            if(!pedidoOrdinario.isEmpty()){
                return pedidoOrdinario[0].Fecha_Limite_de_Entrega__c; 
            }
        }

        else if(tipoDePedido == 'Ordinario'){
            Datetime dateTimeLimiteDeEntrega = currentDateTime;
            if(isRestoDelPais){              
                dateTimeLimiteDeEntrega = calcularFechaHabil(currentDateTime, 5);
                return dateTimeLimiteDeEntrega; 
            } else{
                dateTimeLimiteDeEntrega = calcularFechaHabil(currentDateTime, 3);
                return dateTimeLimiteDeEntrega; 
            }
        }
        

        return null;
    }

    public static Datetime calcularFechaHabil(Datetime fechaDeCreacion, Integer diasHabiles){        
        // Calculate the date 3 business days in the future
        Integer businessDaysToAdd = diasHabiles;
        Datetime futureDate = fechaDeCreacion;
        while (businessDaysToAdd > 0) {
            // Add one day to the date
            futureDate = futureDate.addDays(1);
            
            // Convert the date to a datetime with a default time of midnight
            Datetime futureDateTime = Datetime.newInstance(futureDate.year(), futureDate.month(), futureDate.day());
            
            // Check if the day is a weekend (Saturday or Sunday)
            if (futureDateTime.format('E') != 'Sat' && futureDateTime.format('E') != 'Sun') {
                // Decrease the number of business days to add
                businessDaysToAdd--;
            }
        }
        
        // Return the resulting date
        return futureDate;
    }

    // public static List<Order__c> createOrders(List<Orden> orders){
	// 	List<Order__c> orderList = new List<Order__c>();
    //     List<Order_Line_Item__c> orderLineItems = new List<Order_Line_Item__c>();
		
    //     // Insert order list
    //     for(Orden order : orders) {
    //         Order__c o = new Order__c();
    //     	o.Contacto__c = Id.valueOf(order.Idcontacto);
    //         o.UMU__c = Id.valueOf(order.IdUmu);
    //         o.Tipo_de_Pedido__c = order.TipoDePedido;
    //         o.Estatus__c = 'Verificando Disponibilidad';
            
    //         if(order.esPrograma != null && order.esPrograma) {
    //             if(order.TipoDePedido == 'Emergencia Sanitaria' || order.TipoDePedido == 'Programa') {
    //                 o.Fecha_Limite_de_Entrega__c = order.fechaMaxima;
    //             }
    //             o.Es_Programa__c = order.esPrograma;
    //         } else {
    //             if(order.TipoDePedido != 'Ordinario'){
    //                 o.Numero_de_Oficio__c = order.numeroOficio;
    //                 o.Motivo__c = order.justificacion;
    //                 o.Estatus_No_Ordinario__c = 'Por Aprobar';
    //             }
                
    //             o.ltima_Fecha_de_Validaci_n_de_DPN_Activa__c = getUltimaFechaActivaDPN(Id.valueOf(order.IdUmu), true);
    //             o.Pr_ximaFecha_de_Validaci_n_de_DPN_Activa__c = getUltimaFechaActivaDPN(Id.valueOf(order.IdUmu), false);
    //         }
    //         orderList.add(o); 
    //     }

    //     try {
    //         insert orderList;
    //     } catch(DmlException error) {
    //         System.debug('Error Inserting OrderList: ' + error.getMessage());
    //     }
        
    //     // Insert order line items 
    //     List<Order_Line_Item__c> items = new List<Order_Line_Item__c>();
    //     for(Orden order : orders) {
    //         for(Order__c orderObj : orderList) {
    //             if(orderObj.UMU__c == order.IdUmu) {
    //                 items = AgregarOrdenes(order.ordenesDetails, orderObj.Id, order.IdUmu);
    //                 for(Order_Line_Item__c item : items) {
    //                     item.Order__c = orderObj.Id;
    //                     orderLineItems.add(item);
    //                 }
    //             }
    //         }
    //     }
		
    //     try{
    //         insert orderLineItems; 
    //     } catch(DmlException error){
    //         System.debug('Error Inserting OrderLineItems: ' + error.getMessage());
    //         return null; 
    //     }

    //     // Get the inserted orders and olis with all the required information
    //     Set<Id> orderIdsSet = new Set<Id>();
    //     for(Order__c ord : orderList) {
    //         orderIdsSet.add(ord.Id);
    //     }
    //     Map<Id, Order__c> queriedOrderMap = new Map<Id, Order__c>([
    //         SELECT Id, Name 
    //         FROM Order__c 
    //         WHERE Id IN: orderIdsSet
    //     ]);
    //     Set<Id> oliIdsSet = new Set<Id>();
    //     for(Order_Line_Item__c oli : orderLineItems) {
    //         oliIdsSet.add(oli.Id);
    //     }
    //     List<Order_Line_Item__c> queriedOLIList = [
    //         SELECT Id, Name, Order__c, Numero_de_Subalmacen__c, Order_Line_Item_Classification__c 
    //         FROM Order_Line_Item__c 
    //         WHERE Id IN: oliIdsSet
    //     ];
    //     if(queriedOLIList.isEmpty() || queriedOrderMap.isEmpty()){ return null; }
            
    //     // Insert order line items classification records and sort by subalmacen
    //     List<Order_Line_Item_Classification__c> oliClassList = getOliClassificationList(queriedOrderMap, queriedOLIList);
    //     if(oliClassList.isEmpty()){ return orderList; }  
    //     try{
    //         insert oliClassList; 
    //     } catch(DmlException error){
    //         System.debug('Error Inserting OLI Classifications: ' + error.getMessage());
    //         return null; 
    //     }

    //     // Update order line items with their respective classification by subalmacen
    //     List<Order_Line_Item__c> oliListToUpdate = getOliRelatedToClassificationList(oliClassList, queriedOLIList);
    //     if(oliListToUpdate.isEmpty()){ return orderList; }  
    //     try{
    //         update oliListToUpdate; 
    //     } catch(DmlException error){
    //         System.debug('Error Updating OLI with Classifications: ' + error.getMessage());
    //         return null; 
    //     }

    //     return orderList;
    // }

    // public static List<Order_Line_Item_Classification__c> getOliClassificationList(Map<Id, Order__c> queriedOrderMap, List<Order_Line_Item__c> queriedOLIList){
    //     Map<Id, Set<String>> orderBySubalmacenMap = new Map<Id, Set<String>>();
    //     for(Order_Line_Item__c oli : queriedOLIList){
    //         String numeroSubAlmacen = String.valueOf(oli.Numero_de_Subalmacen__c);
    //         if(numeroSubAlmacen != null && oli.Order__c != null){
    //             if(!orderBySubalmacenMap.containsKey(oli.Order__c)){
    //                 orderBySubalmacenMap.put(oli.Order__c, new Set<String>());
    //             }
    //             orderBySubalmacenMap.get(oli.Order__c).add(numeroSubAlmacen);
    //         } 
    //     }

    //     List<Order_Line_Item_Classification__c> oliClassList = new List <Order_Line_Item_Classification__c>();
    //     for(Id orderId : orderBySubalmacenMap.keySet()){
    //         for(String subalmacen : orderBySubalmacenMap.get(orderId)){
    //             Order_Line_Item_Classification__c oliClassRec = new Order_Line_Item_Classification__c();
    //             oliClassRec.Name = subalmacen + '-' + queriedOrderMap.get(orderId).Name;
    //             oliClassRec.Orden__c = orderId;
    //             oliClassRec.Numero_de_Subalmacen__c = subalmacen;
    //             oliClassList.add(oliClassRec);
    //         }
    //     }
    //     return oliClassList;
    // }

    // public static List<Order_Line_Item__c> getOliRelatedToClassificationList(List<Order_Line_Item_Classification__c> oliClassList, List<Order_Line_Item__c> queriedOLIList){
    //     List<Order_Line_Item__c> oliListToUpdate = new List<Order_Line_Item__c>();
    //     for(Order_Line_Item_Classification__c classification : oliClassList){
    //         for(Order_Line_Item__c oli : queriedOLIList){ 
    //             String subalmacenStr = String.valueOf(oli.Numero_de_Subalmacen__c);
    //             if(classification.Orden__c == oli.Order__c && subalmacenStr == classification.Numero_de_Subalmacen__c){
    //                 oli.Order_Line_Item_Classification__c = classification.Id;
    //                 oliListToUpdate.add(oli);
    //             } 
    //         } 
    //     }
    //     return oliListToUpdate;
    // } 
    
    // public static List<Order_Line_Item__c> AgregarOrdenes(List<Ordenes_Line_Item> ordenesDetails, Id orderId, Id umuId){
    //     List<Order_Line_Item__c> listaDeOrdenes = new List<Order_Line_Item__c>();
    //     for(Ordenes_Line_Item ordenes: ordenesDetails){
    //         Order_Line_Item__c ordenItem = new Order_Line_Item__c(
    //                         Product__c = ordenes.insumoId,
    //                         Cantidad_Solicitada__c = ordenes.CantidadSolicitada,
    //                         Order__c = orderId,
    //                         L_mite_Mensual_DPN__c = getInfoClavesDPNActiva(umuId, ordenes.insumoId, true),
    //                         Consumido_DPN__c = getInfoClavesDPNActiva(umuId, ordenes.insumoId, false)
    //         );
    //         listaDeOrdenes.add(ordenItem);
    //     }

    //     return listaDeOrdenes;
    // }

    public static Integer getInfoClavesDPNActiva(Id umuId, Id productId, Boolean isLimiteMensual){  
        Integer quantity = 0;
        String dpnRecordId = null;

        List<DPN__c> dpnList = [
            SELECT Id
            FROM DPN__c
            WHERE Account__c =: umuId
                AND Estatus__c =: ESTATUS_ACTIVO
            LIMIT 1
        ];

        if(!dpnList.isEmpty()){
            dpnRecordId = dpnList[0].Id;
        } else{
            return quantity;
        }

        String query = 'SELECT L_mite_Mensual__c, Consumido__c FROM DPN_Line_Item__c WHERE DPN__c =: dpnRecordId AND Product__c =: productId LIMIT 1';
        List<DPN_Line_Item__c> dpnLNIDataList = Database.query(query);

        if(dpnLNIDataList.size() == 1){
            DPN_Line_Item__c dpnLineItem = dpnLNIDataList[0];
            quantity = isLimiteMensual ? Integer.valueOf(dpnLineItem.L_mite_Mensual__c) : Integer.valueOf(dpnLineItem.Consumido__c);
        } 
        return quantity;
    }

    public static Date getUltimaFechaActivaDPN(Id umuId, Boolean isUltimaFecha){  
        Date ultimaFechaActiva = Date.today();

        List<DPN__c> dpnList = [
            SELECT Id, Name, Estatus__c, Account__c
            FROM DPN__c
            WHERE Account__c =: umuId
                AND Estatus__c =: ESTATUS_ACTIVO
        ];

        if(dpnList.size() != 1){
            return ultimaFechaActiva;
        }

        Id dpnRecordId = dpnList[0].Id;
        String query = 'SELECT Id, Name, Fecha__c FROM D_a_de_Pedido__c WHERE DPN__c =: dpnRecordId';
        if(isUltimaFecha){
            query += ' AND Fecha__c <= TODAY ORDER BY Fecha__c DESC LIMIT 1';
        } else{
            query += ' AND Fecha__c >= TODAY ORDER BY Fecha__c ASC LIMIT 1';
        }

        List<D_a_de_Pedido__c> fechaDeValidacion = Database.query(query);

        if(fechaDeValidacion.size() == 1){
            ultimaFechaActiva = fechaDeValidacion[0].Fecha__c;
        } 
        return ultimaFechaActiva;
    }

    // @AuraEnabled
    // public static List<ContentVersion> generatePdfFiles(String idOrden){

    //     Order__c order = [
    //         SELECT Id, Contacto__r.Email, UMU__c, Es_Programa__c, Tipo_de_Pedido__c, ID_de_Pedido__c
	// 		FROM Order__c
    //         WHERE Id = :idOrden
    //         LIMIT 1
    //     ];

    //     Account umu = [
    //         SELECT Id, Name, Clave_Presupuestal__c
    //         FROM Account
    //         WHERE Id = :order.UMU__c
    //     ];

    //     List<ContentVersion> contentVersionList = new List<ContentVersion>();
    //     Map<Decimal, List<ContentVersion>> contentVersionMap = new Map<Decimal, List<ContentVersion>>();
    //     //List<Id> orderIds = new List<Id>();
    //     //orderIds.add(order.Id);

    //     // Filter pdf by email
    //     Map<String, Set<Id>> filterPdfByEmail = new Map<String, Set<Id>>();

    //     // Obtener los productos line item relacionados a la orden
    //     Map<Id, List<Order_Line_Item__c>> orderLineItem = getOrderLineItem(order.Id);

    //     String idsParameters;
    //     String subalmacen;
    //     List<String> productIds;
    //     List<String> productList = new List<String>();
    //     Map<Decimal, List<Id>> subalmanecenes;
    //     Account umuEmail = new Account();
    //     Map<Decimal, String> subalmacenEmailMap = new Map<Decimal, String>();

    //     //Separar cada lista de orden line item con su respetivo id de la orden
    //     for(Id orderId: orderLineItem.keySet()){
    //         // crear mapa para guardar los subalmacenes
    //         subalmanecenes = GetSubalmacenFilter(orderId, orderLineItem);

    //         system.debug('subalmanecenes: ' + subalmanecenes);
    //         // Hacer loop por cada subalmacen y guardar cada pdf en la lista de content version
    //         for(Decimal subalmacenId: subalmanecenes.keySet()){
    //             List<ContentVersion> subalmacenContentVersions = new List<ContentVersion>();
    //             productIds = subalmanecenes.get(subalmacenId);
    //             idsParameters = String.join(productIds, ',');
    //             subalmacen = String.valueOf(subalmacenId);

    //             Subalmacen__c subalmacenEmail = [SELECT Email__c FROM Subalmacen__c WHERE Numero_de_Subalmacen__c = :subalmacen LIMIT 1];
    // 			subalmacenEmailMap.put(subalmacenId, subalmacenEmail.Email__c);

    //             system.debug('idsParameters: ' + idsParameters);
    //             system.debug('subalmacen: ' + subalmacen);
    //             system.debug('productIds: ' + productIds);
    //             system.debug('orderId: ' + orderId);

    //             // agregar todos los productos a una lista, para luego ser parseados a .csv
    //             productList.addAll(productIds);

    //             // Crear la pagina con el id de la orden y su subalmacen para luego hacerle renderAsPDF.
    //             // Pagereference pageRef = new Pagereference('/apex/confirmacionDePedido?id=' + orderId + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);

    //             Pagereference pageRef;
    //             if(order.Es_Programa__c == false) {
    //                 pageRef = new Pagereference('/apex/PreAutorizacionDePedido?id=' + orderId + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);
    //             } else {
    //                 pageRef = new Pagereference('/apex/confirmacionDePedido?id=' + orderId + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);
    //             }

    //             Blob contentBlob = pageRef.getContentAsPDF();
    //             ContentVersion contentVersion = new ContentVersion();
    //             contentVersion.VersionData = contentBlob;
    //             contentVersion.Title = subalmacenId + ' - Confirmacion De Pedido PDF.pdf';
    //             contentVersion.PathOnClient = 'ConfirmacionDePedido.pdf';
    //             contentVersion.FirstPublishLocationId = orderId; 
    //             contentVersionList.add(contentVersion);

    //             for (ContentVersion cv : contentVersionList) {
    //                 if (cv.Title.startsWith(String.valueOf(subalmacenId))) {
    //                     subalmacenContentVersions.add(contentVersion);
    //                 }
    //             }
    //             contentVersionMap.put(subalmacenId, subalmacenContentVersions);
    //             umuEmail = [SELECT Id, Email__c FROM Account WHERE Id = :order.UMU__c LIMIT 1];
    //         }
    //     }

    //     ContentVersion content = createCSVFiles(productList, idOrden);
    //     contentVersionList.add(content);

    //     try {
    //         insert contentVersionList;
    //         if(order.Es_Programa__c == false) {
    //             SendEmail.sendEmailWithAttachments(contentVersionList, order.Contacto__r.Email);
    //         } else {
    //             if(umuEmail != null) {
    //                 SendEmail.sendTemplateEmailWithAttachments(contentVersionList, umuEmail.Email__c, order, umu);
    //             }
    //         }

    //         /*else {
    //             Set<String> uniqueEmails = new Set<String>();
    //             for (Decimal subalmacenId : contentVersionMap.keySet()) {
    //                 List<ContentVersion> subalmacenContentVersions = contentVersionMap.get(subalmacenId);
    //                 String subalmacenEmail = subalmacenEmailMap.get(subalmacenId);

    //                 SendEmail.sendEmailWithAttachments(subalmacenContentVersions, subalmacenEmail);
    //             }
    //         }*/
    //         return contentVersionList;
    //     } catch (DmlException error) {
    //         System.debug('An erros has ocurred: ' + error.getMessage());
    //         return null;
    //     }
    //   }

    // @testVisible
    // public static Map<Id, List<Order_Line_Item__c>> getOrderLineItem(Id orderId){
    //     Map<Id, List<Order_Line_Item__c>> orderLineItem = new Map<Id, List<Order_Line_Item__c>>();

    //     for(Order_Line_Item__c item: [SELECT Id, Numero_de_Subalmacen__c, Order__c, Product__c, UMU__c
    //                                   FROM Order_Line_Item__c 
    //                                   WHERE Order__c = :orderId]){
    //                                       if(!orderLineItem.containsKey(item.Order__c)){
    //                                           orderLineItem.put(item.Order__c, new List<Order_Line_Item__c>());
    //                                       }
    //                                       orderLineItem.get(item.Order__c).add(item);
    //                                   }
    //     return orderLineItem;
    // }

    @testVisible
    public static Map<Id, List<Order_Line_Item__c>> getOrderLineItems(Set<String> orderIds) {
        Map<Id, List<Order_Line_Item__c>> orderLineItemsMap = new Map<Id, List<Order_Line_Item__c>>();
        List<Order_Line_Item__c> orderLineItems = [SELECT Id, Order__c, Product__c, Numero_de_Subalmacen__c, UMU__c
                                                   FROM Order_Line_Item__c
                                                   WHERE Order__c IN :orderIds];

        for (Order_Line_Item__c item : orderLineItems) {
            if (!orderLineItemsMap.containsKey(item.UMU__c)) {
                orderLineItemsMap.put(item.UMU__c, new List<Order_Line_Item__c>());
            }

            orderLineItemsMap.get(item.UMU__c).add(item);
        }

        return orderLineItemsMap;
    }

    @AuraEnabled
    public static List<ContentVersion> generatePdfFiles(List<String> orderIds){

        List<Order__c> orders = [
            SELECT Id, Contacto__r.Email, UMU__c, Order_Number__c, Es_Programa__c, Tipo_de_Pedido__c, ID_de_Pedido__c
			FROM Order__c
            WHERE Id IN :orderIds
        ];

        Set<String> orderIdsSet = new Set<String>(orderIds);
        Map<Id, List<Order_Line_Item__c>> orderLineItemsMap = getOrderLineItems(orderIdsSet);

        Account umuItem = new Account();

        List<ContentVersion> contentVersionList = new List<ContentVersion>();
        Map<String, List<ContentVersion>> contentVersionMap = new Map<String, List<ContentVersion>>();

        Map<String, String> umuEmailMap = new Map<String, String>();
        Map<String, String> subalmacenEmailMap = new Map<String, String>();
        String idsParameters;
        List<String> productList = new List<String>();
        List<String> allProductList = new List<String>();

        system.debug('orderLineItemsMap: ' + orderLineItemsMap);

        for(Id key : orderLineItemsMap.keySet()) {
            List<Order_Line_Item__c> itemList = orderLineItemsMap.get(key);
            system.debug('itemList: ' + itemList);

            for(Order__c order : orders) {
                List<Id> productIds = new List<Id>();
                //List<String> subalmacenes = new List<String>();
                String subalmacen = '';

                for(Order_Line_Item__c item : itemList) {
                    if(order.Id == item.Order__c) {
                        productIds.add(item.Product__c);
                        if(subalmacen == '') { subalmacen = String.valueOf(item.Numero_de_Subalmacen__c); }
                        // if(!subalmacenes.contains(String.valueOf(item.Numero_de_Subalmacen__c))) {
                        //     subalmacenes.add(String.valueOf(item.Numero_de_Subalmacen__c));
                        // }
                    }
                }

                umuItem = [
                    SELECT Id, Name, Clave_Presupuestal__c
                    FROM Account
                    WHERE Id = : order.UMU__c LIMIT 1
                ];

                system.debug('umuItem: ' + umuItem);
                system.debug('subalmacen: ' + subalmacen);
                system.debug('productIds: ' + productIds);

                if(subalmacen != '') {
                    List<ContentVersion> subalmacenContentVersions = new List<ContentVersion>();
                    idsParameters = String.join(productIds, ',');

                    Subalmacen__c subalmacenEmail = [SELECT Email__c FROM Subalmacen__c WHERE Numero_de_Subalmacen__c = :subalmacen LIMIT 1];
                    subalmacenEmailMap.put(subalmacen, subalmacenEmail.Email__c);

                    Pagereference pageRef = new Pagereference('/apex/confirmacionDePedido?id=' + order.Id + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);

                    Blob contentBlob = pageRef.getContentAsPDF();
                    ContentVersion contentVersion = new ContentVersion();
                    contentVersion.VersionData = contentBlob;
                    contentVersion.Title = subalmacen + ' - Confirmacion De Pedido PDF.pdf';
                    contentVersion.PathOnClient = 'ConfirmacionDePedido.pdf';
                    //contentVersion.FirstPublishLocationId = order.Id; 
                    contentVersionList.add(contentVersion);
                    subalmacenContentVersions.add(contentVersion);

                    ContentVersion content = createCSVFiles(productList, true);
                    contentVersionList.add(content);

                    if(!contentVersionMap.containsKey(key)) {
                        contentVersionMap.put(key, new List<ContentVersion>());
                    }
                    contentVersionMap.get(key).addAll(subalmacenContentVersions);

                    String umuEmail = [SELECT Id, Email__c FROM Account WHERE Id = :order.UMU__c LIMIT 1].Email__c;
                    if(!umuEmailMap.containsKey(key)) {
                        umuEmailMap.put(key, umuEmail);
                    }

                    system.debug('');
                    system.debug('subalmacen: ' + subalmacen);
                    system.debug('idsParameters: ' + idsParameters);
                    system.debug('contentVersionList: ' + contentVersionList);
                    system.debug('contentVersionMap: ' + contentVersionMap);
                    system.debug('umuEmailMap: ' + umuEmailMap);
                }

                // for(String subalmacen : subalmacenes) {
                //     List<ContentVersion> subalmacenContentVersions = new List<ContentVersion>();
                //     idsParameters = String.join(productIds, ',');

                //     Subalmacen__c subalmacenEmail = [SELECT Email__c FROM Subalmacen__c WHERE Numero_de_Subalmacen__c = :subalmacen LIMIT 1];
                //     subalmacenEmailMap.put(subalmacen, subalmacenEmail.Email__c);

                //     Pagereference pageRef = new Pagereference('/apex/confirmacionDePedido?id=' + order.Id + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);

                //     Blob contentBlob = pageRef.getContentAsPDF();
                //     ContentVersion contentVersion = new ContentVersion();
                //     contentVersion.VersionData = contentBlob;
                //     contentVersion.Title = subalmacen + ' - Confirmacion De Pedido PDF.pdf';
                //     contentVersion.PathOnClient = 'ConfirmacionDePedido.pdf';
                //     //contentVersion.FirstPublishLocationId = order.Id; 
                //     contentVersionList.add(contentVersion);
                //     subalmacenContentVersions.add(contentVersion);

                //     ContentVersion content = createCSVFiles(productList, true);
                //     contentVersionList.add(content);

                //     if(!contentVersionMap.containsKey(key)) {
                //         contentVersionMap.put(key, new List<ContentVersion>());
                //     }
                //     contentVersionMap.get(key).addAll(subalmacenContentVersions);

                //     String umuEmail = [SELECT Id, Email__c FROM Account WHERE Id = :order.UMU__c LIMIT 1].Email__c;
                //     if(!umuEmailMap.containsKey(key)) {
                //         umuEmailMap.put(key, umuEmail);
                //     }

                //     system.debug('');
                //     system.debug('subalmacen: ' + subalmacen);
                //     system.debug('idsParameters: ' + idsParameters);
                //     system.debug('contentVersionList: ' + contentVersionList);
                //     system.debug('contentVersionMap: ' + contentVersionMap);
                //     system.debug('umuEmailMap: ' + umuEmailMap);
                // }
            }

            for(Order_Line_Item__c item : itemList) {
                allProductList.add(item.Id);
            }
            
            if(contentVersionMap.containsKey(key)) {
                List<contentVersion> csvContentList = new  List<contentVersion>();
                csvContentList.add(createCSVFiles(allProductList, false));
                contentVersionMap.get(key).addAll(csvContentList);
            }
        }

        for(String key: contentVersionMap.keySet()) {
            List<ContentVersion> values = contentVersionMap.get(key);
            System.debug('-----Key: ' + key);
            System.debug('-----Values: ' + values);
        }

        try {
            insert contentVersionList;
            for(String key : umuEmailMap.keySet()) {
                List<contentVersion> cvList = contentVersionMap.get(key);
                Account umu = [
                    SELECT Id, Name, Clave_Presupuestal__c
                    FROM Account
                    WHERE Id = : key LIMIT 1
                ];

                if(cvList.size() > 0) {
                    String umuEmail = umuEmailMap.get(key);
                    if(orders.get(0).Es_Programa__c != true) {
                        SendEmail.sendEmailWithAttachments(cvList, umuEmail);
                    } else {
                        SendEmail.sendTemplateEmailWithAttachments(cvList, umuEmail, orders.get(0), umu);
                    }
                }
            }
            return contentVersionList;
        } catch (DmlException error) {
            System.debug('An erros has ocurred: ' + error.getMessage());
            return null;
        }
    }

    @AuraEnabled
    public static ContentVersion createContentVersion(String title, String versionData, String pathOnClient, String contactId,
                                                      String orderId, String programName, String summaryJson) {
        Contact contact = [SELECT Id, Name, Email FROM Contact WHERE Id = :contactId];
        Order__c order = [SELECT Id, ID_de_Pedido__c, Tipo_de_Pedido__c, Fecha_de_Creacion__c FROM Order__c WHERE Id = :orderId];

        List<ContentVersion> contentVersionList = new List<ContentVersion>();
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.Title = title;
        contentVersion.VersionData = EncodingUtil.base64Decode(versionData);
        contentVersion.PathOnClient = pathOnClient;
        contentVersionList.add(contentVersion);

        try {
            System.debug(summaryJson);
            System.debug(programName);
            insert contentVersionList;
            SendEmail.sendProgramEmailWithAttachments(contentVersionList, contact.Email, summaryJson, order, programName);
            return contentVersion;
        } catch (Exception e) {
            System.debug('An error occurred while creating ContentVersion: ' + e.getMessage());
            return null;
        }
    }

    @AuraEnabled
    public static void generateUnifiedPDFs(List<String> contentVersionIds, String contactId) {
        Contact contact = [SELECT Id, Name, Email FROM Contact WHERE Id = :contactId];
        
        String contentVersionIdsStr = String.join(contentVersionIds, ',');
        
        // Construye la URL de la página "unifiedPDFs" y pasa los parámetros
        PageReference pageRef = Page.unifiedPDFs;
        pageRef.getParameters().put('contentVersions', contentVersionIdsStr);
        //Pagereference pageRef = new Pagereference('/apex/unifiedPDFs?contentVersions=' + contentVersionIdsStr);
        
        List<ContentVersion> contentVersionList = new List<ContentVersion>();
        Blob contentBlob = pageRef.getContentAsPDF();
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.VersionData = contentBlob;
        contentVersion.Title = 'Pedido general.pdf';
        contentVersion.PathOnClient = 'PedidoGeneral.pdf';
        contentVersionList.add(contentVersion);
        
        try {
            insert contentVersionList;
            SendEmail.sendEmailWithAttachments(contentVersionList, contact.Email);
            system.debug(contentVersionIds);
            system.debug(contentVersionIdsStr);
            system.debug(contentVersionList);
            //return contentVersionList;   
        } catch (Exception error) {
            System.debug('An erros has ocurred: ' + error.getMessage());
            //return null;
        }
    }

    public static ContentVersion createCSVFiles2(List<String> productList){
        
        List<Order_Line_Item__c> listSubalmacen = [
            SELECT Product__r.Name, Numero_de_Subalmacen__c 
            FROM Order_Line_Item__c WHERE Id IN : productList
        ];
        
        Set<String> csvRows = new Set<String>();
        
        // Agregar los valores de Subalmacen__r.Name y Subalmacen__r.Numero_de_Subalmacen__c
        for (Order_Line_Item__c product : listSubalmacen) {
            csvRows.add(product.Product__r.Name + ',' + product.Numero_de_Subalmacen__c);
        }
        
        List<String> csvList = new List<String>(csvRows); 
        
        List<String> headers = new List<String>{'INSUMO','NÚMERO DE SUBALMACEN'};
            
            String csvString = String.join(headers, ',') + '\n' + String.join(csvList, '\n');
        Blob contentBlob = Blob.valueOf(csvString);
        
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.VersionData = contentBlob;
        contentVersion.Title = 'FILE CSV.csv';
        contentVersion.PathOnClient = 'File.csv';
        //contentVersion.FirstPublishLocationId = OrderId; 
        return contentVersion;
    }

    public static ContentVersion createCSVFiles(List<String> productList, Boolean asociateRecord){
        
        List<Order_Line_Item__c> listSubalmacen = [
            SELECT Product__r.Name, Numero_de_Subalmacen__c, Order__c 
            FROM Order_Line_Item__c WHERE Id IN : productList
        ];
        
        Set<String> csvRows = new Set<String>();
        
        // Agregar los valores de Subalmacen__r.Name y Subalmacen__r.Numero_de_Subalmacen__c
        for (Order_Line_Item__c product : listSubalmacen) {
            csvRows.add(product.Product__r.Name + ',' + product.Numero_de_Subalmacen__c);
        }
        
        List<String> csvList = new List<String>(csvRows); 
        
        List<String> headers = new List<String>{'NOMBRE DE SUBALMACEN','NÚMERO DE SUBALMACEN'};
            
            String csvString = String.join(headers, ',') + '\n' + String.join(csvList, '\n');
        Blob contentBlob = Blob.valueOf(csvString);
        
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.VersionData = contentBlob;
        contentVersion.Title = 'FILE CSV.csv';
        contentVersion.PathOnClient = 'File.csv';
        if(asociateRecord && listSubalmacen.size() > 0) {
            contentVersion.FirstPublishLocationId = listSubalmacen.get(0).Order__c; 
        }
        return contentVersion;
    }
    
    @testVisible
    public static Set<Id> getOrderId(List<Order__c> orderList){
        Set<Id> orderIds = new Set<Id>();
        for(Order__c order: orderList){
            orderIds.add(order.Id);
        } 
        return orderIds;
    }
    
    @testVisible 
    public static Map<Decimal, List<Id>> GetSubalmacenFilter(String orderId, Map<Id, List<Order_Line_Item__c>> orderLineItem){
        
        Map<Decimal, List<Id>> subalmacenList = new Map<Decimal, List<Id>>();
        for(Order_Line_Item__c item: orderLineItem.get(orderId)){
            // verificar si no existe el subalmancen y crear una nueva lista con el id del almacen
            if(!subalmacenList.containsKey(item.Numero_de_Subalmacen__c)){
                subalmacenList.put(item.Numero_de_Subalmacen__c, new List<Id>());
            }
            // añadir item a su subalmacen
            subalmacenList.get(item.Numero_de_Subalmacen__c).add(item.Product__c);
        }
        return subalmacenList;
    }
}