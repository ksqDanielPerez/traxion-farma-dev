public with sharing class AprobacionDePedidosClass {

    private static ParametersDataTable dataTableParams;
    private static final String TIPO_DE_PEDIDO_EXCENTO = 'Ordinario';
    private static final String TIPO_DE_PEDIDO_NO_VALIDO = 'Programa';
    private static final String ESTATUS_ACTIVO = 'Activo'; 

    private static final String ESTATUS_APROBACION = 'Aprobado'; 
    private static final String ESTATUS_MODIFICADO = 'Modificado'; 
    private static final String ESTATUS_PENDIENTE = 'Pendiente'; 
    
    // -------------------------- CAN BE AND WILL BE REFACTORED --------------------------
    // TO APPROVE 
    @AuraEnabled
    public static List<Pedido__c> getFilteredPedidos(Date fechaInicio, Date fechaFin, String estatusNoOrdinario){
        
        List<Id> accountIdList = UserContactClass.getAccountIdsFromUser();
        Set<Id> pedidoIdSet = new Set<Id>();
        List<Order_Line_Item__c> oliList = [
            SELECT Id, Pedido__c 
            FROM Order_Line_Item__c 
            WHERE UMU__c IN: accountIdList 
        ];
        for(Order_Line_Item__c oli : oliList){
            pedidoIdSet.add(oli.Pedido__c);
        } 
        List<Id> pedidoIdList = new List<Id>(pedidoIdSet);

        List<Pedido__c> pedidosList = MisPedidosClass.pedidosQuery(fechaInicio, fechaFin, false, TIPO_DE_PEDIDO_EXCENTO, TIPO_DE_PEDIDO_NO_VALIDO, pedidoIdList, null);
        
        List<Pedido__c> filteredPedidoList = new List<Pedido__c>();
        for (Pedido__c pedido : pedidosList) {
            if (hasMatchingOrderLineItem(pedido, estatusNoOrdinario)) {
                filteredPedidoList.add(pedido);
            }
        }
        return filteredPedidoList;
    }

    private static Boolean hasMatchingOrderLineItem(Pedido__c pedido, String estatusNoOrdinario) {
        for (Order_Line_Item__c oli : pedido.Order_Line_Items__r) {
            if (oli.Estatus_Aprobaci_n__c == estatusNoOrdinario || (oli.Estatus_Aprobaci_n__c == 'Modificado' && estatusNoOrdinario != 'Pendiente')) {
                return true;
            }
        } 
        return false;
    }

    @AuraEnabled
    public static List<Pedido__c> updateOrderLineItem(Id orderLineId, String actionType, Integer quantity, String message){ 
        List<Order_Line_Item__c> oliList = [
            SELECT Id, Name, Estatus__c, Motivo_No_Aprobaci_n__c, Cantidad_Solicitada__c, Tipo_de_Pedido__c,  
                Account__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Pedido__c,
                Existencia_en_UMU__c, Disponible_en_CENADI__c, Cantidad_de_Piezas__c, Costo__c, Cantidad_Rechazada__c, Order__c,
                Account__r.Estado__c, Product__c, Product__r.Name, Product__r.Product_Code_ID__c, Estatus_Aprobaci_n__c, 
                Dispobible_a_Solicitar__c, Estatus_Autorizaci_n__c, Cantidad_Autorizada__c, Autorizaci_n_Cantidad_Rechazada__c, 
                Motivo_No_Autorizaci_n__c
            FROM Order_Line_Item__c 
            WHERE Id =: orderLineId
            LIMIT 1
        ]; 

        if(oliList.size() == 0){
            return null;
        } 

        Order_Line_Item__c oliToUpdate = oliList[0]; 

        Integer cantidadRechazada = Integer.valueOf(oliToUpdate.Cantidad_Solicitada__c) - quantity;
        oliToUpdate.Estatus_Aprobaci_n__c = actionType;
        oliToUpdate.Cantidad_Aprobada__c = quantity;
        oliToUpdate.Cantidad_Rechazada__c = cantidadRechazada;
        oliToUpdate.Motivo_No_Aprobaci_n__c = message; 

        if(actionType == 'Rechazado'){
            oliToUpdate.Estatus_Autorizaci_n__c = actionType;
            oliToUpdate.Cantidad_Autorizada__c = quantity;
            oliToUpdate.Autorizaci_n_Cantidad_Rechazada__c = cantidadRechazada;
            oliToUpdate.Motivo_No_Autorizaci_n__c = message; 
        }

        try{
            update oliToUpdate;
        } catch(DMLException e){
            System.debug(e.getMessage());
            return null;
        } 

        List<Pedido__c> pedidoWithRelatedOLI = [
            SELECT Id, Name, CreatedDate, Tipo_de_Pedido__c, ID_de_Pedido__c, Folio_de_Pedido__c, UMU__c, 
                Fecha_Limite_de_Entrega__c, Estatus__c, Numero_de_Oficio__c, Mostrar_Envio_a_Autorizacion__c, 
                Total_de_Claves__c, Total_de_Piezas__c, Creado_Por__c, Creado_Por__r.Name, UMU__r.Name, UMU__r.UMU__c, 
                UMU__r.Estado__c, UMU__r.Colonia__c, UMU__r.Delegacion__c, UMU__r.Clave_Presupuestal__c, UMU__r.Tipo_UMU__c, 
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Cantidad_de_Piezas__c, Costo__c, Estatus_Aprobaci_n__c, 
                    Account__r.Name, Account__r.Clave_Presupuestal__c, Account__r.Estado__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                    Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Subalmacen__r.Numero_de_Subalmacen__c,
                    Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c,
                    Product__r.Programa__r.Name, Product__r.Description__c 
                FROM Order_Line_Items__r)
            FROM Pedido__c
            WHERE Id =: oliToUpdate.Pedido__c
            LIMIT 1
        ];

        if(actionType == 'Aprobado' || actionType == 'Modificado'){
            pedidoWithRelatedOLI[0].Mostrar_Envio_a_Autorizacion__c = true;
            try{
                update pedidoWithRelatedOLI;
            } catch(DMLException e){
                System.debug(e.getMessage());
                return null;
            }  
        } 
        return pedidoWithRelatedOLI;
    } 

    @AuraEnabled
    public static Pedido__c updateIdDePedido(Id pedidoId){

        Id contactId = UserContactClass.getContactIdFromUser(); 

        List<Id> pedidoIdList = new List<Id>{pedidoId}; 

        List<Pedido__c> pedidosList = MisPedidosClass.pedidosQuery(null, null, null, null, null, pedidoIdList, null); 

        if(pedidosList.isEmpty()){
            return null; 
        } 

        Pedido__c pedidoToUpdate = pedidosList[0]; 
        String currentPedidoId = pedidoToUpdate.ID_de_Pedido__c;
        Integer currentPedidoIdApprovalSegmentNumber = Integer.valueOf(currentPedidoId.substring(currentPedidoId.indexOf('-')+1, currentPedidoId.lastIndexOf('-'))) + 1;
        String newOrderId = currentPedidoId.substring(0, currentPedidoId.indexOf('-')+1) + String.valueOf(currentPedidoIdApprovalSegmentNumber).leftPad(2, '0') + currentPedidoId.substring(currentPedidoId.lastIndexOf('-'));        
        pedidoToUpdate.ID_de_Pedido__c = newOrderId; 
        pedidoToUpdate.Mostrar_Envio_a_Autorizacion__c = false;
        pedidoToUpdate.Aprobado_Por__c = contactId;
        update pedidoToUpdate;

        if(pedidoToUpdate.Creado_Por__r.Email != null){
            List<String> emailAddresses = new List<String>();
            emailAddresses.add(pedidoToUpdate.Creado_Por__r.Email);
            String emailTemplate = 'Respuesta_Pre_Autorizacion';
            Boolean isAutorizacion = false;
            sendEmaiPreAutorizacion(isAutorizacion, pedidoToUpdate.Id, pedidoToUpdate.Creado_Por__c, emailAddresses, emailTemplate);
        }

        return pedidoToUpdate;
    }

    // -------------------------- CAN BE AND WILL BE REFACTORED --------------------------
    // TO AUTHORIZE
    @AuraEnabled
    public static List<Pedido__c> getFilteredOrdersToAuthorize(Date fechaInicio, Date fechaFin, String estatusNoOrdinario){  
        
        List<Id> accountIdList = UserContactClass.getAccountIdsFromUser();
        Set<Id> pedidoIdSet = new Set<Id>();
        List<Order_Line_Item__c> oliList = [
            SELECT Id, Pedido__c 
            FROM Order_Line_Item__c 
            WHERE UMU__c IN: accountIdList 
                AND (Estatus_Aprobaci_n__c =: ESTATUS_APROBACION
                OR Estatus_Aprobaci_n__c =: ESTATUS_MODIFICADO) 
        ];
        for(Order_Line_Item__c oli : oliList){
            pedidoIdSet.add(oli.Pedido__c);
        }  
        List<Id> pedidoIdList = new List<Id>(pedidoIdSet);
        
        List<String> validOptionsToAthorize = new List<String>{ESTATUS_APROBACION, ESTATUS_MODIFICADO};

        List<Pedido__c> pedidosList = MisPedidosClass.pedidosQuery(fechaInicio, fechaFin, false, TIPO_DE_PEDIDO_EXCENTO, TIPO_DE_PEDIDO_NO_VALIDO, pedidoIdList, validOptionsToAthorize);
    
        List<Pedido__c> filteredPedidoList = new List<Pedido__c>();
        for(Pedido__c pedido : pedidosList){ 
            for(Order_Line_Item__c oli : pedido.Order_Line_Items__r){
                if(oli.Estatus_Autorizaci_n__c == estatusNoOrdinario || (oli.Estatus_Autorizaci_n__c == 'Modificado' && estatusNoOrdinario != 'Pendiente')){
                    filteredPedidoList.add(pedido);
                    break;
                }
            } 
        }
        return filteredPedidoList;
    } 

    @AuraEnabled
    public static List<Pedido__c> updateOrderLineItemToAuthorize(Id orderLineId, String actionType, Integer quantity, String message){ 
        
        List<Order_Line_Item__c> oliList = [
            SELECT Id, Name, Estatus__c, Motivo_No_Aprobaci_n__c, Motivo_No_Autorizaci_n__c, Cantidad_Solicitada__c, Tipo_de_Pedido__c,  
                Account__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Pedido__c,
                Existencia_en_UMU__c, Disponible_en_CENADI__c, Cantidad_de_Piezas__c, Costo__c, Cantidad_Rechazada__c, Order__c, Estatus_Autorizaci_n__c, 
                Account__r.Estado__c, Product__c, Product__r.Name, Product__r.Product_Code_ID__c, Estatus_Aprobaci_n__c, Dispobible_a_Solicitar__c
            FROM Order_Line_Item__c 
            WHERE Id =: orderLineId
            LIMIT 1
        ]; 

        if(oliList.size() == 0){
            return null;
        } 

        Order_Line_Item__c oliToUpdate = oliList[0]; 

        Integer cantidadRechazada = Integer.valueOf(oliToUpdate.Cantidad_Solicitada__c) - quantity;
        oliToUpdate.Estatus_Autorizaci_n__c = actionType;
        oliToUpdate.Cantidad_Autorizada__c = quantity; 
        oliToUpdate.Autorizaci_n_Cantidad_Rechazada__c = cantidadRechazada;
        oliToUpdate.Motivo_No_Autorizaci_n__c = message; 

        try{
            update oliToUpdate;
        }catch(DMLException e){
            System.debug(e.getMessage());
            return null;
        }  

        List<String> validOptionsToAthorize = new List<String>{ESTATUS_APROBACION, ESTATUS_MODIFICADO}; 
        List<Pedido__c> pedidoWithRelatedOLI = [
            SELECT Id, Name, CreatedDate, Tipo_de_Pedido__c, ID_de_Pedido__c, Folio_de_Pedido__c, UMU__c, 
                Fecha_Limite_de_Entrega__c, Estatus__c, Numero_de_Oficio__c, Mostrar_Envio_a_Autorizacion__c, 
                Total_de_Claves__c, Total_de_Piezas__c, Creado_Por__c, Creado_Por__r.Name, UMU__r.Name, UMU__r.UMU__c, 
                UMU__r.Estado__c, UMU__r.Colonia__c, UMU__r.Delegacion__c, UMU__r.Clave_Presupuestal__c, UMU__r.Tipo_UMU__c, 
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Cantidad_de_Piezas__c, Costo__c, 
                    Estatus_Aprobaci_n__c, Estatus_Autorizaci_n__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Account__r.Estado__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                    Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Subalmacen__r.Numero_de_Subalmacen__c,
                    Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c,
                    Product__r.Programa__r.Name, Product__r.Description__c 
                FROM Order_Line_Items__r WHERE Estatus_Aprobaci_n__c IN: validOptionsToAthorize)
            FROM Pedido__c
            WHERE Id =: oliToUpdate.Pedido__c
            LIMIT 1
        ];

        if(actionType == 'Autorizado' || actionType == 'Modificado'){
            pedidoWithRelatedOLI[0].Mostrar_Autorizacion__c = true;
            try{
                update pedidoWithRelatedOLI;
            } catch(DMLException e){
                System.debug(e.getMessage());
                return null;
            }  
        } 
        return pedidoWithRelatedOLI; 
    } 

    @AuraEnabled
    public static String generatePedidoInWMS(Id pedidoId){

        List<Order__c> orderList = [
            SELECT Id
            FROM Order__c
            WHERE Pedido__c =: pedidoId
        ];

        List<String> orderIdList = new List<String>();
        for(Order__c ord : orderList){
            orderIdList.add(ord.Id);
        }

        return UserContactClass.checkGeneracionDePedido(orderIdList);
    }

    @AuraEnabled
    public static Pedido__c updateAuthorizationIdDePedidoFromOrder(Id pedidoId){

        Id contactId = UserContactClass.getContactIdFromUser(); 

        List<Id> pedidoIdList = new List<Id>{pedidoId}; 

        List<String> validOptionsToAthorize = new List<String>{ESTATUS_APROBACION, ESTATUS_MODIFICADO};

        List<Pedido__c> pedidosList = MisPedidosClass.pedidosQuery(null, null, null, null, null, pedidoIdList, validOptionsToAthorize); 

        if(pedidosList.isEmpty()){
            return null; 
        } 

        Pedido__c pedidoToUpdate = pedidosList[0]; 
        String currentPedidoId = pedidoToUpdate.ID_de_Pedido__c;
        Integer lastTwoDigits = Integer.valueOf(currentPedidoId.substring(currentPedidoId.length() - 2)) + 1;
        String newPedidoId = currentPedidoId.substring(0, currentPedidoId.length() - 2) + String.valueOf(lastTwoDigits).leftPad(2, '0');
        pedidoToUpdate.ID_de_Pedido__c = newPedidoId;
        pedidoToUpdate.Mostrar_Autorizacion__c = false;
        pedidoToUpdate.Autorizado_Por__c = contactId; 
        update pedidoToUpdate;

        if(pedidoToUpdate.Creado_Por__r.Email != null){
            List<String> emailAddresses = new List<String>();
            emailAddresses.add(pedidoToUpdate.Creado_Por__r.Email);
            String emailTemplate = 'Respuesta_Autorizacion';
            Boolean isAutorizacion = true;
            sendEmaiPreAutorizacion(isAutorizacion, pedidoToUpdate.Id, pedidoToUpdate.Creado_Por__c, emailAddresses, emailTemplate);
        }

        return pedidoToUpdate;
    }



    public static void sendEmaiPreAutorizacion(Boolean isAutorizacion, Id pedidoId, Id contactId, List<String> contactEmail, 
        String emailTemplate){ 

        List<Pedido__c> pedidoList = [
            SELECT ID_de_Pedido__c
            FROM Pedido__c
            WHERE Id =: pedidoId
            LIMIT 1
        ];
        String idDePedido = pedidoList[0].ID_de_Pedido__c;


        List<Order__c> orderList = [
            SELECT Id
            FROM Order__c
            WHERE Pedido__c =: pedidoId
        ];

        List<Order_Line_Item__c> oliList = [
            SELECT Id, Product__c, Order__c, Pedido__c
            FROM Order_Line_Item__c
            WHERE Pedido__c =: pedidoId
        ];
        List<Id> productIds = new List<Id>();
        for(Order_Line_Item__c oli : oliList){
            productIds.add(oli.Product__c);
        }
        String idsParameters = String.join(productIds, ',');

        List<ContentVersion> contentVersionList = new List<ContentVersion>(); 
        // Pagereference pageRef = new Pagereference('/apex/PreAutorizacionDePedido?id=' + orderId + '&idsubalmacen=' + subalmacen + '&listaProductos=' + idsParameters);
        
        String vfPageToRender = '/apex/PreAutorizacionDePedido?id=';
        if(isAutorizacion){
            vfPageToRender = '/apex/AutorizacionDePedido?id=';
        } 

        Pagereference pageRef = new Pagereference(vfPageToRender + orderList[0].Id + '&listaProductos=' + idsParameters);

        Blob contentBlob = pageRef.getContentAsPDF();
        ContentVersion contentVersion = new ContentVersion();
        contentVersion.VersionData = contentBlob;
        contentVersion.Title = idDePedido + '.pdf';
        contentVersion.PathOnClient = 'AprobacionDePedido.pdf';
        contentVersion.FirstPublishLocationId = orderList[0].Id; 
        contentVersionList.add(contentVersion);
        insert contentVersionList;

        List<String> conVerList = new List<String>();
        for(ContentVersion conver : contentVersionList){
            conVerList.add(conVer.Id);
        }

        // List<String> contentDocumentIdsList = getFieldIdsList(orderId);
        // List<ContentVersion> contentVersionList = [Select Id from ContentVersion where ContentDocumentId IN: contentDocumentIdsList];   
        // List<String> conVerList = new List<String>();
        // for(ContentVersion conver : contentVersionList){
        //     conVerList.add(conVer.Id);
        // }


        EmailTemplate et = [SELECT Id, Subject, Body FROM EmailTemplate WHERE DeveloperName =: emailTemplate];
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setTemplateId(et.Id);
        mail.setToAddresses(contactEmail);
        mail.setTargetObjectId(contactId); 
        mail.setWhatId(orderList[0].Id); 

        mail.setEntityAttachments(conVerList); 

        mail.setSaveAsActivity(false);
        mail.setUseSignature(false);

        List<Messaging.SingleEmailMessage> mailList = new List<Messaging.SingleEmailMessage>();
        mailList.add(mail);

        System.debug(mailList.size());

        if(!mailList.isEmpty()){
            Messaging.sendEmail(mailList);
        }
    }

    public static List<String> getFieldIdsList(Id orderId){
        List<DocumentWrapper> documentWrapperList  = FilesController.getAllDocumentsAndRelatedFiles(orderId);
        List<String> fileIds = new List<String>();

        for (DocumentWrapper doc : documentWrapperList) {
            fileIds.addAll(getFileIdsFromDocument(doc));
        }
        return fileIds;
    }

    private static List<String> getFileIdsFromDocument(DocumentWrapper doc) {
        List<String> fileIds = new List<String>();
        if (!doc.files.isEmpty()) {
            for(Integer i = 0; i < doc.files.size(); i++){
                fileIds.add(doc.files[i].id);
            } 
        }
        return fileIds;
    }
    // -------------------------- CAN BE AND WILL BE REFACTORED --------------------------


}