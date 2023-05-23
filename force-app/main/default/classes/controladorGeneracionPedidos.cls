public without sharing class controladorGeneracionPedidos {

    private static final String ESTATUS_ACTIVO = 'Activo'; 

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

    // payload
    // {
    //     "IdContact": "Hkd76s7dhDSKH",
    //     "IdUMU": "1000003213",
    //     "TipoDePedido": "No Ordinario",
    //     "Ordenes": [{"test": "test"},{"test": "test"}]
    //  }

    @AuraEnabled
    public static Order__c DeserializarOrden(String payload){
        Orden orden = (Orden)JSON.deserialize(payload, Orden.class);
        system.debug('Orden: ' + orden);
        Order__c order_created = CreateOrder(orden);
        return order_created;
    }

    @AuraEnabled
    public static List<Order__c> deserializeOrders(String payload){
        List<Orden> orders = (List<Orden>)JSON.deserialize(payload, List<Orden>.class);
        system.debug('Orden: ' + orders);
        List<Order__c> orderCreated = createGuideOrders(orders);
        return orderCreated;
    }
    
    public static Order__c CreateOrder(Orden ordenClass){

        Order__c orden = new Order__c();

        //crear orden 
        orden.Contacto__c = Id.valueOf(ordenClass.Idcontacto);
        orden.UMU__c = Id.valueOf(ordenClass.IdUmu);
        orden.Tipo_de_Pedido__c = ordenClass.TipoDePedido;
        orden.Estatus__c = 'Verificando Disponibilidad';
        if(ordenClass.TipoDePedido != 'Ordinario'){
            orden.Numero_de_Oficio__c = ordenClass.numeroOficio;
            orden.Motivo__c = ordenClass.justificacion;
            orden.Estatus_No_Ordinario__c = 'Por Aprobar';
        }

        orden.ltima_Fecha_de_Validaci_n_de_DPN_Activa__c = getUltimaFechaActivaDPN(Id.valueOf(ordenClass.IdUmu), true);
        orden.Pr_ximaFecha_de_Validaci_n_de_DPN_Activa__c = getUltimaFechaActivaDPN(Id.valueOf(ordenClass.IdUmu), false);

        insert orden;
        List<Order_Line_Item__c> generacionPedido = AgregarOrdenes(ordenClass.ordenesDetails, orden.Id);
		
        try{
            insert generacionPedido;
            return orden;
        }catch(DmlException error){
           System.debug('An error has occured: ' + error.getMessage());
            return null;
        }
       
    }

    public static List<Order__c> createGuideOrders(List<Orden> orders){
		List<Order__c> orderList = new List<Order__c>();
        List<Order_Line_Item__c> orderLineItems = new List<Order_Line_Item__c>();
		
        for(Orden order : orders) {
            Order__c o = new Order__c();
        	o.Contacto__c = Id.valueOf(order.Idcontacto);
            o.UMU__c = Id.valueOf(order.IdUmu);
            o.Tipo_de_Pedido__c = order.TipoDePedido;
            o.Estatus__c = 'Verificando Disponibilidad';
            if(order.TipoDePedido == 'Emergencia Sanitaria' || order.TipoDePedido == 'Programa') {
                o.Fecha_Limite_de_Entrega__c = order.fechaMaxima;
            }
            if(order.esPrograma) {
                o.Es_Programa__c = order.esPrograma;
            }
            orderList.add(o);
            system.debug('ordenes: ' + o);
        }

        try {
            insert orderList;
        } catch(DmlException error) {
            System.debug('Error Inserting OrderList: ' + error.getMessage());
        }
        
        List<Order_Line_Item__c> items = new List<Order_Line_Item__c>();
        
        for(Orden order : orders) {
            for(Order__c orderObj : orderList) {
                if(orderObj.UMU__c == order.IdUmu) {
                    items = AgregarOrdenes(order.ordenesDetails, orderObj.Id);
                    
                    for(Order_Line_Item__c item : items) {
                        orderLineItems.add(item);
                        system.debug('item: ' + item);
                    }
                }
            }
        }
		
        try{
            insert orderLineItems;
            system.debug(orderLineItems);
            return orderList;
        } catch(DmlException error){
            System.debug('Error Inserting OrderLineItems: ' + error.getMessage());
            return null;
        }
    }
    
    public static List<Order_Line_Item__c> AgregarOrdenes(List<Ordenes_Line_Item> ordenesDetails, Id ordenId){
        
        List<Order_Line_Item__c> listaDeOrdenes = new List<Order_Line_Item__c>();
        
        for(Ordenes_Line_Item ordenes: ordenesDetails){
            
        Order_Line_Item__c ordenItem = new Order_Line_Item__c(
                         Product__c = ordenes.insumoId,
                         Order__c = ordenId,
                         Cantidad_Solicitada__c = ordenes.CantidadSolicitada
            
         );
            listaDeOrdenes.add(ordenItem);
        }

        return listaDeOrdenes;
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
    
    @AuraEnabled
    public static List<ContentVersion> generatePdfFiles(String idOrden){
   		
        Order__c order = [SELECT Id, Contacto__r.Email, Es_Programa__c FROM Order__c WHERE Id = :idOrden LIMIT 1];
        // Lista para guardar todos los PDF
        List<ContentVersion> contentVersionList = new List<ContentVersion>();
        
        // Filter pdf by email
        Map<String, Set<Id>> filterPdfByEmail = new Map<String, Set<Id>>();
               
        // Obtener los productos line item relacionados a la orden
        Map<Id, List<Order_Line_Item__c>> orderLineItem = getOrderLineItem(order.Id);
        
        String idsParameters;
        String subalmacen;
        List<String> productIds;
        List<String> productList = new List<String>();
        Map<Decimal, List<Id>> subalmanecenes;
        
        //Separar cada lista de orden line item con su respetivo id de la orden
        for(Id orderId: orderLineItem.keySet()){
            // crear mapa para guardar los subalmacenes
            subalmanecenes = GetSubalmacenFilter(orderId, orderLineItem);
            
            system.debug('subalmanecenes: ' + subalmanecenes);
            // Hacer loop por cada subalmacen y guardar cada pdf en la lista de content version
            for(Decimal subalmacenId: subalmanecenes.keySet()){
                productIds = subalmanecenes.get(subalmacenId);
               
                idsParameters = String.join(productIds, ',');
                subalmacen = String.valueOf(subalmacenId);
                
                system.debug('idsParameters: ' + idsParameters);
                system.debug('subalmacen: ' + subalmacen);
                system.debug('productIds: ' + productIds);
                system.debug('orderId: ' + orderId);

                // agregar todos los productos a una lista, para luego ser parseados a .csv
                productList.addAll(productIds);

                // Crear la pagina con el id de la orden y su subalmacen para luego hacerle renderAsPDF.
                Pagereference pageRef = new Pagereference('/apex/confirmacionDePedido?id=' + orderId + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);
                
                Blob contentBlob = pageRef.getContentAsPDF();
                ContentVersion contentVersion = new ContentVersion();
                contentVersion.VersionData = contentBlob;
                contentVersion.Title = subalmacenId + ' - Confirmacion De Pedido PDF.pdf';
                contentVersion.PathOnClient = 'ConfirmacionDePedido.pdf';
                contentVersion.FirstPublishLocationId = orderId; 
                contentVersionList.add(contentVersion);
                
            }
        }
        //ContentVersion content = createCSVFiles(productList, idOrden);
        //contentVersionList.add(content);
            
        try {
            insert contentVersionList;
            //if(order.Es_Programa__c == false) {
                //SendEmail.sendEmailWithAttachments(contentVersionList, order.Contacto__r.Email);
            //}
            SendEmail.sendEmailWithAttachments(contentVersionList, order.Contacto__r.Email);
            return contentVersionList;
            /*return 'idsParameters: ' + String.valueOf(idsParameters) + '\n'
                + 'subalmacen: ' + String.valueOf(subalmacen) + '\n'
                + 'productIds: ' + String.valueOf(productIds) + '\n'
                + 'subalmanecenes: ' + String.valueOf(subalmanecenes) + '\n'
                + 'orderLineItem: ' + String.valueOf(orderLineItem) + '\n'
                + 'productList: ' + String.valueOf(productList);*/
        } catch (DmlException error) {
            System.debug('An erros has ocurred: ' + error.getMessage());
            return null;
        }
      }
    
    @AuraEnabled
    public static ContentVersion createContentVersion(String title, String versionData, String pathOnClient, String contactId) {
        Contact contact = [SELECT Id, Name, Email FROM Contact WHERE Id = :contactId];
        
        List<ContentVersion> contentVersionList = new List<ContentVersion>();
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.Title = title;
        contentVersion.VersionData = EncodingUtil.base64Decode(versionData);
        contentVersion.PathOnClient = pathOnClient;
        contentVersionList.add(contentVersion);
        
        try {
            insert contentVersionList;
            SendEmail.sendEmailWithAttachments(contentVersionList, contact.Email);
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

      public static ContentVersion createCSVFiles(List<String> productList, String OrderId){
       
        List<Product2> listSubalmacen = [SELECT Subalmacen__r.Name, Subalmacen__r.Numero_de_Subalmacen__c FROM Product2 WHERE Id IN : productList];

        Set<String> csvRows = new Set<String>();

        // Agregar los valores de Subalmacen__r.Name y Subalmacen__r.Numero_de_Subalmacen__c
        for (Product2 product : listSubalmacen) {
            csvRows.add(product.Subalmacen__r.Name + ',' + product.Subalmacen__r.Numero_de_Subalmacen__c);
        }

        List<String> csvList = new List<String>(csvRows); 

        List<String> headers = new List<String>{'NOMBRE DE SUBALMACEN','NÚMERO DE SUBALMACEN'};
       
        String csvString = String.join(headers, ',') + '\n' + String.join(csvList, '\n');
        Blob contentBlob = Blob.valueOf(csvString);

        ContentVersion contentVersion = new ContentVersion();
        contentVersion.VersionData = contentBlob;
        contentVersion.Title = 'FILE CSV.csv';
        contentVersion.PathOnClient = 'File.csv';
        contentVersion.FirstPublishLocationId = OrderId; 
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
       public static Map<Id, List<Order_Line_Item__c>> getOrderLineItem(Id orderId){
           Map<Id, List<Order_Line_Item__c>> orderLineItem = new Map<Id, List<Order_Line_Item__c>>();
          
           for(Order_Line_Item__c item: [SELECT Id, Numero_de_Subalmacen__c, Order__c, Product__c
                                         FROM Order_Line_Item__c 
                                         WHERE Order__c =:orderId]){
              if(!orderLineItem.containsKey(item.Order__c)){
                   orderLineItem.put(item.Order__c, new List<Order_Line_Item__c>());
              }
              orderLineItem.get(item.Order__c).add(item);
           }
           
           return orderLineItem;
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