public with sharing class AprobacionDePedidosClass {

    private static ParametersDataTable dataTableParams;
    private static final String TIPO_DE_PEDIDO_EXCENTO = 'Ordinario';
    private static final String TIPO_DE_PEDIDO_NO_VALIDO = 'Programa';
    private static final String ESTATUS_ACTIVO = 'Activo'; 
    


    @AuraEnabled
    // public static List<Order__c> getFilteredOrders(String estatusNoOrdinario, List<String> clavesSeleccionadas, List<String> umusSeleccionadas, List<String> estadosSeleccionados, List<String> pedidosSeleccionados, List<String> transportesSeleccionados, Date fechaInicio, Date fechaFin){
    public static List<Order__c> getFilteredOrders(String jsonString){    
        
        // Get values from wrapper
        dataTableParams = (ParametersDataTable)JSON.deserialize(jsonString, ParametersDataTable.class);
        
        // Order list to return 
        List<Order__c> orderList = new List<Order__c>();

        // Get related account Ids from contact
        List<Id> accountIdList = UserContactClass.getAccountIdsFromUser(); 

        // Get filtered order list 
        List<Id> filteredOrderIdList = new List<Id>();
        if (!dataTableParams.clavesSeleccionadas.isEmpty() || !dataTableParams.umusSeleccionadas.isEmpty() || !dataTableParams.estadosSeleccionados.isEmpty() 
            || !dataTableParams.pedidosSeleccionados.isEmpty()) {
            filteredOrderIdList = getFilteredOrderIds(dataTableParams.clavesSeleccionadas, dataTableParams.umusSeleccionadas, dataTableParams.estadosSeleccionados, dataTableParams.pedidosSeleccionados, dataTableParams.transportesSeleccionados);
            orderList = getOrders(dataTableParams.estatusNoOrdinario, accountIdList, dataTableParams.fechaInicio, dataTableParams.fechaFin, filteredOrderIdList);
        } else{  
            orderList = getOrders(dataTableParams.estatusNoOrdinario, accountIdList, dataTableParams.fechaInicio, dataTableParams.fechaFin, filteredOrderIdList); 
        }
        return orderList;
    } 

    @AuraEnabled
    public static List<Order_Line_Item__c> getOrderLineItems(List<Id> orderIdList){ 
        return [
            SELECT Id, Name, Estatus__c, Tipo_de_Pedido__c, Order__c, Account__c, Account__r.Name, Account__r.Clave_Presupuestal__c,
                L_mite_Mensual_DPN__c, Consumido_DPN__c, Account__r.Estado__c, Product__r.Name, Product__r.Product_Code_ID__c, Estatus_Aprobaci_n__c
            FROM Order_Line_Item__c 
            WHERE Order__c IN: orderIdList
        ];
    }  

    private static List<Id> getFilteredOrderIds(List<String> clavesSeleccionadas, List<String> umusSeleccionadas, List<String> estadosSeleccionados, List<String> pedidosSeleccionados, List<String> transportesSeleccionados) {
        String orderLineItemQuery = 'SELECT Estatus__c, Tipo_de_Pedido__c, Order__c, Product__c, Estatus_Aprobaci_n__c, ' +
            'Product__r.Product_Code_ID__c, Account__c, Account__r.Clave_Presupuestal__c, Account__r.Estado__c ' +
        'FROM Order_Line_Item__c ' + 
        'WHERE Product__c != Null';  

        if(!clavesSeleccionadas.isEmpty()){
            orderLineItemQuery += ' AND Product__r.Product_Code_ID__c IN: clavesSeleccionadas';
        }
        if(!umusSeleccionadas.isEmpty()){
            orderLineItemQuery += ' AND Account__r.Clave_Presupuestal__c IN: umusSeleccionadas';
        }
        if(!estadosSeleccionados.isEmpty()){
            orderLineItemQuery += ' AND Account__r.Estado__c IN: estadosSeleccionados';
        }
        if(!pedidosSeleccionados.isEmpty()){
            orderLineItemQuery += ' AND Tipo_de_Pedido__c IN: pedidosSeleccionados';
        } 

        List<Id> filteredOrderIdList = new List<Id>();
        List<Order_Line_Item__c> orderLineItemList = Database.query(orderLineItemQuery);
        for(Order_Line_Item__c oli : orderLineItemList){
            filteredOrderIdList.add(oli.Order__c);
        }   
        return filteredOrderIdList;
    }

    private static List<Order__c> getOrders(String estatusNoOrdinario, List<Id> accountIdList, Date fechaInicio, Date fechaFin, List<Id> filteredOrderIdList) {
        

        String orderQuery = 'SELECT Id, Name, CreatedDate, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, ' +
            'Fecha_de_Creacion__c, Estatus__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, ' +
            'Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, UMU__r.Clave_Presupuestal__c, ' +
            'UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, ' +
            '(SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, ' +
                'Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, ' +
                'Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, ' +
                'Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c, ' +
                'Product__r.Programa__r.Name ' +
            'FROM Order_Line_Items__r WHERE Estatus_Aprobaci_n__c =: estatusNoOrdinario) ' +
        'FROM Order__c ' + 
        'WHERE UMU__c IN: accountIdList' +
            ' AND Tipo_de_Pedido__c !=: TIPO_DE_PEDIDO_EXCENTO' +
            ' AND Tipo_de_Pedido__c !=: TIPO_DE_PEDIDO_NO_VALIDO' +
            // ' AND Estatus_No_Ordinario__c =: estatusNoOrdinario' +
            ' AND CreatedDate >=: fechaInicio' +
            ' AND CreatedDate <=: fechaFin';  
        if(!filteredOrderIdList.isEmpty()){
            orderQuery += ' AND Id IN: filteredOrderIdList';
        } 
        // return Database.query(orderQuery); 

        List<Order__c> orderList = Database.query(orderQuery); 
        
        List<Order__c> filteredOrderList = new List<Order__c>();
        for(Order__c ord : orderList){
            if(ord.Order_Line_Items__r.size()>0){
                for(Order_Line_Item__c oli : ord.Order_Line_Items__r){
                    if(oli.Estatus_Aprobaci_n__c == estatusNoOrdinario){
                        filteredOrderList.add(ord);
                        break;
                    }
                }
            }
        }
        return filteredOrderList;
    }  

    @AuraEnabled
    public static List<Order__c> updateOrderLineItem(Id orderLineId, String actionType, Integer quantity, String message){ 
        List<Order__c> orderWithRelatedOLI = new List<Order__c>();

        List<Order_Line_Item__c> oliList = [
            SELECT Id, Name, Estatus__c, Cantidad_Solicitada__c, Tipo_de_Pedido__c, Order__c, Dispobible_a_Solicitar__c,
                Account__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, 
                Existencia_en_UMU__c, Disponible_en_CENADI__c, Cantidad_de_Piezas__c, Costo__c, Cantidad_Rechazada__c,
                Account__r.Estado__c, Product__c, Product__r.Name, Product__r.Product_Code_ID__c, Estatus_Aprobaci_n__c
            FROM Order_Line_Item__c 
            WHERE Id =: orderLineId
            LIMIT 1
        ]; 

        if(oliList.size() == 0){
            return orderWithRelatedOLI;
        } 

        Order_Line_Item__c oliToUpdate = oliList[0]; 

        if(actionType == 'Modificado'){

            Order_Line_Item__c oliToReject = new Order_Line_Item__c();

            Integer cantidadRechazada = Integer.valueOf(oliToUpdate.Cantidad_Solicitada__c) - quantity;
            oliToReject.Order__c = oliToUpdate.Order__c;
            oliToReject.Product__c = oliToUpdate.Product__c;
            oliToReject.L_mite_Mensual_DPN__c = oliToUpdate.L_mite_Mensual_DPN__c;
            oliToReject.Consumido_DPN__c = oliToUpdate.Consumido_DPN__c;
            oliToReject.Existencia_en_UMU__c = oliToUpdate.Existencia_en_UMU__c;
            oliToReject.Disponible_en_CENADI__c = oliToUpdate.Disponible_en_CENADI__c;
            oliToReject.Cantidad_Solicitada__c = oliToUpdate.Cantidad_Solicitada__c;
            oliToReject.Cantidad_de_Piezas__c = oliToUpdate.Cantidad_de_Piezas__c;
            oliToReject.Costo__c = oliToUpdate.Costo__c;
            oliToReject.Estatus_Aprobaci_n__c = 'Rechazado';
            oliToReject.Cantidad_Rechazada__c = cantidadRechazada;
            oliToReject.Motivo_No_Aprobaci_n__c = message; 
            try{
                insert oliToReject;
            }catch(DMLException e){
                System.debug(e.getMessage());
                return orderWithRelatedOLI;
            } 

            oliToUpdate.Estatus_Aprobaci_n__c = 'Aprobado';
            oliToUpdate.Cantidad_Aprobada__c = quantity;
            oliToUpdate.Motivo_No_Aprobaci_n__c = message; 
            try{
                update oliToUpdate;
            }catch(DMLException e){
                System.debug(e.getMessage());
                return orderWithRelatedOLI;
            } 

        } else{
            oliToUpdate.Estatus_Aprobaci_n__c = actionType;
            oliToUpdate.Cantidad_Pre_Aprobada__c = quantity;
            oliToUpdate.Motivo_No_Aprobaci_n__c = message; 
    
            try{
                update oliToUpdate;
            }catch(DMLException e){
                System.debug(e.getMessage());
                return orderWithRelatedOLI;
            }  
        }

        orderWithRelatedOLI = [
                SELECT Id, Name, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, Fecha_de_Creacion__c, Estatus__c, 
                    Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, 
                    Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, 
                    UMU__r.Clave_Presupuestal__c, UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, 
                    (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, 
                        Costo__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                        Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                        Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c,
                        Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name 
                    FROM Order_Line_Items__r)
                FROM Order__c
                WHERE Id =: oliToUpdate.Order__c
            ];

        return orderWithRelatedOLI;

        
    }  

    // @AuraEnabled
    // public static List<Order__c> updateOrderLineItem(Id orderLineId, String actionType, Integer quantity, String message){ 
        
    //     List<Order__c> orderWithRelatedOLI = new List<Order__c>();

    //     List<Order_Line_Item__c> oliList = [
    //         SELECT Id, Name, Estatus__c, Tipo_de_Pedido__c, Order__c, Account__c, Account__r.Name, Account__r.Clave_Presupuestal__c, 
    //             Account__r.Estado__c, Product__r.Name, Product__r.Product_Code_ID__c, Estatus_Aprobaci_n__c
    //         FROM Order_Line_Item__c 
    //         WHERE Id =: orderLineId
    //         LIMIT 1
    //     ]; 

    //     if(oliList.size() <= 0){
    //         return orderWithRelatedOLI;
    //     } 

    //     Order_Line_Item__c oliToUpdate = oliList[0]; 
    //     oliToUpdate.Estatus_Aprobaci_n__c = actionType;
    //     oliToUpdate.Cantidad_Pre_Aprobada__c = quantity;
    //     oliToUpdate.Motivo_No_Aprobaci_n__c = message; 

    //     try{
    //         update oliToUpdate;
    //     }catch(DMLException e){
    //         System.debug(e.getMessage());
    //         return orderWithRelatedOLI;
    //     } 


    //     orderWithRelatedOLI = [
    //         SELECT Id, Name, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, Fecha_de_Creacion__c, Estatus__c, 
    //             Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, 
    //             Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, 
    //             UMU__r.Clave_Presupuestal__c, UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, 
    //             (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, 
    //                 Costo__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Product__r.Name, Product__r.Product_Code_ID__c, 
    //                 Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
    //                 Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c,
    //                 Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name 
    //             FROM Order_Line_Items__r)
    //         FROM Order__c
    //         WHERE Id =: oliToUpdate.Order__c
    //     ];

    //     return orderWithRelatedOLI;
    // }  

    @AuraEnabled
    public static List<Order__c> getOrderByOLIId(Id orderId, String estatusNoOrdinario){
        List<Order__c> orderWithRelatedOLI = [
            SELECT Id, Name, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, Fecha_de_Creacion__c, Estatus__c, 
                Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, 
                Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, 
                UMU__r.Clave_Presupuestal__c, UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, 
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, 
                    Costo__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Cantidad_Pre_Aprobada__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                    Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                    Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c,
                    Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name 
                FROM Order_Line_Items__r)
            FROM Order__c
            WHERE Id =: orderId
        ];
        return orderWithRelatedOLI;
    }

    @AuraEnabled
    public static List<Order__c> getFilteredItems(Id orderId, String searchKey){ 
        String name = '%' + searchKey + '%';
        
        List<Order__c> orderWithRelatedOLI = [
            SELECT Id, Name, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, Fecha_de_Creacion__c, Estatus__c, 
                Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, 
                Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, 
                UMU__r.Clave_Presupuestal__c, UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, 
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, 
                    Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, Cantidad_Pre_Aprobada__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                    Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                    Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c,
                    Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name 
                FROM Order_Line_Items__r
                WHERE (Product__r.Name LIKE: name OR Product__r.Product_Code_ID__c LIKE: name))
            FROM Order__c
            WHERE Id =: orderId
        ];
        return orderWithRelatedOLI;
    } 

    @AuraEnabled
    public static Map<String, Date> getDPNDates(Id umuId){  
        Map<String, Date> dateMap = new Map<String, Date>(); 

        List<DPN__c> dpnList = [
            SELECT Id, Name, Estatus__c, Account__c
            FROM DPN__c
            WHERE Account__c =: umuId
                AND Estatus__c =: ESTATUS_ACTIVO
        ];

        if(dpnList.size() == 0){
            return dateMap;
        }

        Id dpnRecordId = dpnList[0].Id;

        List<D_a_de_Pedido__c> proxFechaDeValidacionList = [
            SELECT Id, Name, Fecha__c
            FROM D_a_de_Pedido__c
            WHERE DPN__c =: dpnRecordId 
                AND Fecha__c >= TODAY
                ORDER BY Fecha__c ASC
                LIMIT 1
        ];

        if(proxFechaDeValidacionList.size() == 1){
            dateMap.put('proximaFecha', proxFechaDeValidacionList[0].Fecha__c);
        }

        List<D_a_de_Pedido__c> ultimaFechaDeValidacionList = [
            SELECT Id, Name, Fecha__c
            FROM D_a_de_Pedido__c
            WHERE DPN__c =: dpnRecordId 
                AND Fecha__c <= TODAY
                ORDER BY Fecha__c DESC
                LIMIT 1
        ];

        if(ultimaFechaDeValidacionList.size() == 1){
            dateMap.put('ultimaFecha', ultimaFechaDeValidacionList[0].Fecha__c);
        } 
        return dateMap;
    }

    @AuraEnabled
    public static List<Order__c> updateOrderAndOLIs(Id orderId, String estatusNoOrdinario){
        List<Order__c> orderList = getOrderByOLIId(orderId, estatusNoOrdinario);

        List<Order__c> orderListToUpdate = new List<Order__c>();
        List<Order_Line_Item__c> orderLineItemListToUpdate = new List<Order_Line_Item__c>();
        for(Order__c order : orderList){
            order.Estatus_No_Ordinario__c = 'Aprobado';
            if(order.Order_Line_Items__r.size() > 0){
                for(Order_Line_Item__c oli: order.Order_Line_Items__r){
                    oli.Cantidad_Aprobada__c = oli.Cantidad_Pre_Aprobada__c;
                    orderLineItemListToUpdate.add(oli);
                }
            }
            orderListToUpdate.add(order);
        }
        update orderLineItemListToUpdate;
        update orderListToUpdate;
        return orderListToUpdate;
    }






    // @AuraEnabled
    // public static List<Order_Line_Item__c> getDPNInformation(Id umuId){  
    //     List<Id> prodIds = new List<Id>{'01t3K000003KShWQAW', '01t3K000003KShWQAW'};

    //     Id umuId = '0013K00000y6NnxQAE';

    //     List<DPN__c> dpnList = [
    //         SELECT Id, Name, Estatus__c, Account__c
    //         FROM DPN__c
    //         WHERE Account__c =: umuId
    //         AND Estatus__c =: 'Activo'
    //         LIMIT 1
    //     ];

    //     System.debug(dpnList);

    //     Map<Id, DPN_Line_Item__c> oliIdRelatedDPNLI = new Map<Id, DPN_Line_Item__c>();

    //     List<DPN_Line_Item__c> dpnLineItemList = [
    //         SELECT Id, Name, L_mite_Mensual__c, Consumido__c, Product__c
    //         FROM DPN_Line_Item__c
    //         WHERE DPN__c =: dpnList[0].Id
    //             AND Product__c IN: prodIds
    //     ];
    //     System.debug(dpnLineItemList);

    //     for(DPN_Line_Item__c dpnLI : dpnLineItemList){
    //         oliIdRelatedDPNLI.put(dpnLI.Product__c, dpnLI);
    //     }

    //     System.debug(oliIdRelatedDPNLI);

    //     Set<Id> productIds = oliIdRelatedDPNLI.keySet();

    //     Id orderId = 'a0J3K00000CEKQaUAP';

    //     List<Order_Line_Item__c> orderLineItemList = [
    //         SELECT Id, Name, Product__c, L_mite_Mensual_DPN__c, Consumido_DPN__c
    //         FROM Order_Line_Item__c
    //         WHERE Order__c =: orderId
    //             AND Product__c IN: prodIds
    //     ];

    //     System.debug(orderLineItemList);

    //     List<Order_Line_Item__c> oliList = new List <Order_Line_Item__c>();
    //     for(Order_Line_Item__c oli : orderLineItemList){
    //         if(productIds.contains(oli.Product__c)){
    //             oli.L_mite_Mensual_DPN__c =  oliIdRelatedDPNLI.get(oli.Product__c).L_mite_Mensual__c;
    //             oli.Consumido_DPN__c =  oliIdRelatedDPNLI.get(oli.Product__c).Consumido__c;
    //             oliList.add(oli);
    //         }
    //     }

    //     update oliList;
    // }
}