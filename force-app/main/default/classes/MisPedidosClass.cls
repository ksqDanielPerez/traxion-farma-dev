public with sharing class MisPedidosClass {

    // MIS PEDIDOS LO BUENO 
    @AuraEnabled
    public static String getInstanceURL(string brandId, string ObjectName) {
        return URL.getSalesforceBaseUrl().toExternalForm();
    }  

    @AuraEnabled
    public static List<Pedido__c> getMisPedidos(Date fechaInicio, Date fechaFin){
        List<Pedido__c> filteredPedidoList = new List<Pedido__c>();
        for (Pedido__c pedido : pedidosQuery(fechaInicio, fechaFin, null, null, null, null, null)) {
            if (hasValidOrder(pedido)) {
                filteredPedidoList.add(pedido);
            }
        }
        return filteredPedidoList;
    }

    private static Boolean hasValidOrder(Pedido__c pedido) {
        for (Order__c ord : pedido.Ordenes__r) {
            switch on ord.Tipo_de_Pedido__c {
                when 'Ordinario' {		
                    return true; 
                }	
                when 'Extraordinario', 'Soporte de Vida', 'Urgencia Médica', 'Emergencia Sanitaria' {		
                    if(ord.Es_Programa__c){
                        return true;
                    } else{ 
                        if(pedido.Autorizado_Por__c != null){
                            return true; 
                        }
                    }
                } 
                when 'Programa' {		
                   return true; 
                } 
                when 'Replaneación' {		
                    return true; 
                }
            }
        }
        return false;
    }
        
    public static List<Pedido__c> pedidosQuery (Date fechaInicio, Date fechaFin, Boolean esPrograma, String tipoDePedidoExcento, 
        String tipoDePedidoNoValido, List<Id> pedidoIdList, List<String> validOptionsToAthorize){

        Id contactId = UserContactClass.getContactIdFromUser();

        String orderQuery = 'SELECT Id, Name, CreatedDate, Tipo_de_Pedido__c, ID_de_Pedido__c, Folio_de_Pedido__c, UMU__c, ' +
            'Fecha_Limite_de_Entrega__c, Estatus__c, Numero_de_Oficio__c, Mostrar_Envio_a_Autorizacion__c, Mostrar_Autorizacion__c, '+
            'Es_Programa__c, Total_de_Claves__c, Total_de_Piezas__c, Creado_Por__c, Creado_Por__r.Name, Creado_Por__r.Email, ' +
            'Aprobado_Por__c, Aprobado_Por__r.Name, ' +
            'Autorizado_Por__c, Autorizado_Por__r.Name, UMU__r.Name, UMU__r.Estado__c, UMU__r.Colonia__c, UMU__r.Delegacion__c, ' +
            'UMU__r.Clave_Presupuestal__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, ' +

            // Related Order Line Items
            '(SELECT Id, Estatus__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Cantidad_de_Piezas__c, Costo__c, Estatus_Aprobaci_n__c, ' +
                'Estatus_Autorizaci_n__c, Cantidad_Autorizada__c, Autorizaci_n_Cantidad_Rechazada__c, Motivo_No_Aprobaci_n__c, ' + 
                'Account__r.Name, Account__r.Clave_Presupuestal__c, Account__r.Estado__c, Product__r.Name, Product__r.Product_Code_ID__c, ' +
                'Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Subalmacen__r.Numero_de_Subalmacen__c, ' +
                'Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c, ' +
                'Product__r.Programa__r.Name, Product__r.Description__c ' +
            'FROM Order_Line_Items__r';
            if(validOptionsToAthorize != null && !validOptionsToAthorize.isEmpty()){
                orderQuery += ' WHERE Estatus_Aprobaci_n__c IN: validOptionsToAthorize), ';
            } else{
                orderQuery += '), ';
            }

            // Related Orders
            orderQuery += '(SELECT Id, Estatus__c, Tipo_de_Pedido__c, Es_Programa__c, Autorizado_Por__c ' +
                'FROM Ordenes__r) ' +

        'FROM Pedido__c ';

        if(pedidoIdList != null){
            orderQuery += 'WHERE Id IN: pedidoIdList';
        } else{
            orderQuery += 'WHERE Creado_Por__c =: contactId';
        }

        if(fechaInicio != null){
            Datetime dateTimeFechaInicio = DateTime.newInstance(fechaInicio, Time.newInstance(0, 0, 0, 0));
            orderQuery += ' AND CreatedDate >=: dateTimeFechaInicio';
        } 
        if(fechaFin != null){
            Datetime dateTimeFechaFin = DateTime.newInstance(fechaFin, Time.newInstance(23, 59, 59, 0));
            orderQuery += ' AND CreatedDate <=: dateTimeFechaFin';
        }
        if(esPrograma != null){
            orderQuery += ' AND Es_Programa__c = false';
        }
        if(tipoDePedidoExcento != null){
            orderQuery += ' AND Tipo_de_Pedido__c !=: tipoDePedidoExcento';
        }
        if(tipoDePedidoNoValido != null){
            orderQuery += ' AND Tipo_de_Pedido__c !=: tipoDePedidoNoValido';
        }
        
        orderQuery += ' ORDER BY CreatedDate DESC';

        return Database.query(orderQuery); 
    }

    @AuraEnabled
    public static Map<Id, ContentVersion> getOrderEvidence(List<String> orderIdList) {  
        List<ContentDocumentLink> contentDocumentLinkList = [
            SELECT ContentDocumentId, LinkedEntityId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId IN 
                (
                    SELECT Id 
                    FROM Order__c WHERE
                    Id IN: orderIdList
                )
                AND LinkedEntity.Type = 'Order__c'
        ];
        System.debug(contentDocumentLinkList.size());

        
        Set<Id> contentIds = new Set<Id>();
        for (ContentDocumentLink cont : contentDocumentLinkList) {
            contentIds.add(cont.ContentDocumentId);   
        }
        System.debug(contentIds);
        
        List<ContentVersion> conVersion = [
            SELECT Id, Title, ContentDocumentId
            FROM ContentVersion 
            WHERE ContentDocumentId IN: contentIds 
        ];
        System.debug(conVersion);

        Map<Id, ContentVersion> orderContentMap = new Map<Id, ContentVersion>();
        for (ContentVersion cv : conVersion) {
            orderContentMap.put(cv.ContentDocumentId, cv);
        }
        
        Map<Id, ContentVersion> orderIdContentMap = new Map<Id, ContentVersion>();
        for (ContentDocumentLink cont : contentDocumentLinkList) {
            Id orderId = cont.LinkedEntityId;
            if (orderContentMap.containsKey(cont.ContentDocumentId)) {
                ContentVersion cv = orderContentMap.get(cont.ContentDocumentId);
                orderIdContentMap.put(orderId, cv);
            }
        }
        
        return orderIdContentMap;
    }
    
    @AuraEnabled
    public static List<Order__c> getFilteredOrdersAndOlis(List<String> orderIdList){ 
        return getOrders(orderIdList);
    } 

    private static List<Order__c> getOrders(List<String> orderIdList) {  
        String orderQuery = 'SELECT Id, Name, CreatedDate, Fecha_de_Creacion__c, Seguimiento__c, Order_Number__c, ' +
            'Estatus__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Entrega__c, Entrega__r.Name, Aprobado_Por__c, Aprobado_Por__r.Name, ' +
            'Contacto__c, Contacto__r.Name, UMU__c, UMU__r.Name, UMU__r.Estado__c, UMU__r.Colonia__c, UMU__r.Delegacion__c, UMU__r.Clave_Presupuestal__c, ' +
            '(SELECT Id, Estatus__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Account__r.Estado__c, ' +
                'Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name FROM Order_Line_Items__r) ' +
        'FROM Order__c ' + 
        'WHERE Id IN: orderIdList';
        return Database.query(orderQuery); 
    }  
    // MIS PEDIDOS LO BUENO 

    @AuraEnabled
    public static Order__c certificateOrder(Id selectedOrderId){ 

        List<Order__c> orderToCertificateList = [
            SELECT Id, Firmado_Por__c, Estatus__c, Seguimiento__c, Pedido__c, Pedido__r.Creado_Por__c, Pedido__r.Creado_Por__r.Email
            FROM Order__c
            WHERE Id =: selectedOrderId
            LIMIT 1
        ];

        if(orderToCertificateList.isEmpty()){ return null; }

        Id contactId = UserContactClass.getContactIdFromUser();

        Order__c orderToCertificate = orderToCertificateList[0];
        orderToCertificate.Firmado_Por__c = contactId;
        orderToCertificate.Estatus__c = 'Certificado';

        update orderToCertificate;

        if(orderToCertificate.Pedido__r.Creado_Por__r.Email != null){
            List<String> emailAddresses = new List<String>();
            emailAddresses.add(orderToCertificate.Pedido__r.Creado_Por__r.Email);
            String emailTemplate = 'Acuse_de_Envio_de_Remision_Certificada';
            sendEmaiPreAutorizacion(selectedOrderId, orderToCertificate.Pedido__r.Creado_Por__c, emailAddresses, emailTemplate);
        }

        List<Order__c> returnOrderToCertificateList = [
            SELECT Id, Firmado_Por__c, Estatus__c, Seguimiento__c
            FROM Order__c
            WHERE Id =: orderToCertificate.Id
            LIMIT 1
        ];

        return returnOrderToCertificateList[0];
    } 

    public static void sendEmaiPreAutorizacion(Id orderId, Id contactId, List<String> contactEmail, String emailTemplate){

        EmailTemplate et = [SELECT Id, Subject, Body FROM EmailTemplate WHERE DeveloperName =: emailTemplate];

        List<String> contentDocumentIdsList = getFieldIdsList(orderId);
        List<ContentVersion> contentVersionList = [Select Id from ContentVersion where ContentDocumentId IN: contentDocumentIdsList];   
        List<String> conVerList = new List<String>();
        for(ContentVersion conver : contentVersionList){
            conVerList.add(conVer.Id);
        }

        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setTemplateId(et.Id);
        mail.setToAddresses(contactEmail);
        mail.setTargetObjectId(contactId); 
        mail.setWhatId(orderId); 

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
}