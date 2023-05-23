public with sharing class AprobacionDePedidosClass {

    private static ParametersDataTable dataTableParams;
    private static final String TIPO_DE_PEDIDO_EXCENTO = 'Ordinario';
    private static final String TIPO_DE_PEDIDO_NO_VALIDO = 'Programa';
    private static final String ESTATUS_ACTIVO = 'Activo'; 
    private static final String ESTATUS_APROBACION = 'Aprobado'; 
    
    // -------------------------- CAN BE AND WILL BE REFACTORED --------------------------
    // TO APPROVE 
    @AuraEnabled
    public static List<Order__c> getFilteredOrders(String estatusNoOrdinario, Date fechaInicio, Date fechaFin){         
        List<Id> accountIdList = UserContactClass.getAccountIdsFromUser(); 

        return getOrders(estatusNoOrdinario, accountIdList, fechaInicio, fechaFin);
    } 

    private static List<Order__c> getOrders(String estatusNoOrdinario, List<Id> accountIdList, Date fechaInicio, Date fechaFin) {
        Datetime dateTimeFechaInicio = DateTime.newInstance(fechaInicio, Time.newInstance(0, 0, 0, 0));
        Datetime dateTimeFechaFin = DateTime.newInstance(fechaFin, Time.newInstance(23, 59, 59, 0));
        
        String orderQuery = 'SELECT Id, Name, CreatedDate, Folio_del_Pedido__c, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, ' +
            'Fecha_de_Creacion__c, Estatus__c, Mostrar_Autorizaci_n__c, Mostrar_Env_o_a_Autorizaci_n__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, ' +
            'Total_de_Claves_Aprobadas__c, Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, UMU__r.Clave_Presupuestal__c, ' +
            'UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, ' +
            '(SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, ' +
                'Estatus_Aprobaci_n__c, Motivo_No_Aprobaci_n__c, Motivo_No_Autorizaci_n__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, ' +
                'Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, ' +
                'Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c, ' +
                'Product__r.Programa__r.Name ' +
            'FROM Order_Line_Items__r) ' +
        'FROM Order__c ' + 
        'WHERE UMU__c IN: accountIdList' +
            ' AND Es_Programa__c = false' +
            ' AND Tipo_de_Pedido__c !=: TIPO_DE_PEDIDO_EXCENTO' +
            ' AND Tipo_de_Pedido__c !=: TIPO_DE_PEDIDO_NO_VALIDO' +
            ' AND CreatedDate >=: dateTimeFechaInicio' +
            ' AND CreatedDate <=: dateTimeFechaFin';  

        List<Order__c> orderList = Database.query(orderQuery);         
        List<Order__c> filteredOrderList = new List<Order__c>();
        for(Order__c ord : orderList){
            if(ord.Order_Line_Items__r.size()>0){
                for(Order_Line_Item__c oli : ord.Order_Line_Items__r){
                    if(oli.Estatus_Aprobaci_n__c == estatusNoOrdinario || (oli.Estatus_Aprobaci_n__c == 'Modificado' && estatusNoOrdinario != 'Pendiente')){
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
            SELECT Id, Name, Estatus__c, Motivo_No_Aprobaci_n__c, Motivo_No_Autorizaci_n__c, Cantidad_Solicitada__c, Tipo_de_Pedido__c, Order__c, Dispobible_a_Solicitar__c,
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
            Integer cantidadRechazada = Integer.valueOf(oliToUpdate.Cantidad_Solicitada__c) - quantity;
            oliToUpdate.Estatus_Aprobaci_n__c = actionType;
            oliToUpdate.Cantidad_Aprobada__c = quantity;
            oliToUpdate.Cantidad_Rechazada__c = cantidadRechazada;
            oliToUpdate.Motivo_No_Aprobaci_n__c = message; 

            try{
                update oliToUpdate;
            }catch(DMLException e){
                System.debug(e.getMessage());
                return orderWithRelatedOLI;
            } 
        } else{
            oliToUpdate.Estatus_Aprobaci_n__c = actionType;
            oliToUpdate.Cantidad_Aprobada__c = quantity;
            oliToUpdate.Motivo_No_Aprobaci_n__c = message; 
    
            try{
                update oliToUpdate;
            }catch(DMLException e){
                System.debug(e.getMessage());
                return orderWithRelatedOLI;
            }  
        }

        orderWithRelatedOLI = [
            SELECT Id, Name, ID_de_Pedido__c, Mostrar_Autorizaci_n__c, Mostrar_Env_o_a_Autorizaci_n__c, Estatus_No_Ordinario__c, Folio_Control__c, Fecha_de_Creacion__c, Estatus__c, 
                Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, 
                Total_de_Claves_Aprobadas__c, Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, 
                UMU__r.Clave_Presupuestal__c, UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, 
                (SELECT Id, Estatus__c, Motivo_No_Aprobaci_n__c, Motivo_No_Autorizaci_n__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, 
                    Costo__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                    Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                    Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c,
                    Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name 
                FROM Order_Line_Items__r)
            FROM Order__c
            WHERE Id =: oliToUpdate.Order__c
            LIMIT 1
        ];

        if(actionType == 'Aprobado' || actionType == 'Modificado'){
            orderWithRelatedOLI[0].Mostrar_Env_o_a_Autorizaci_n__c = true;
            update orderWithRelatedOLI;
        }

        return orderWithRelatedOLI;
    } 

    @AuraEnabled
    public static Order__c updateIdDePedidoFromOrder(Id orderId){

        Id contactId = UserContactClass.getContactIdFromUser(); 

        Order__c ordenToUpdate = new Order__c();

        List<Order__c> order = [
            SELECT Id, Name, CreatedDate, Folio_del_Pedido__c, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, 
                Fecha_de_Creacion__c, Estatus__c, Mostrar_Autorizaci_n__c, Mostrar_Env_o_a_Autorizaci_n__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Contacto__r.Email, Numero_de_Oficio__c, 
                Total_de_Claves_Aprobadas__c, Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, UMU__r.Clave_Presupuestal__c, 
                UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c,
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, 
                    Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, 
                    Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                    Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c,
                    Product__r.Programa__r.Name
                FROM Order_Line_Items__r)
            FROM Order__c
            WHERE Id =: orderId
            LIMIT 1 
        ];

        if(order.isEmpty()){
            return ordenToUpdate; 
        } 

        ordenToUpdate = order[0];

        String currentOrderId = ordenToUpdate.ID_de_Pedido__c;
        Integer currentOrderIdApprovalSegmentNumber = Integer.valueOf(currentOrderId.substring(currentOrderId.indexOf('-')+1, currentOrderId.lastIndexOf('-'))) + 1;
        String newOrderId = currentOrderId.substring(0, currentOrderId.indexOf('-')+1) + String.valueOf(currentOrderIdApprovalSegmentNumber).leftPad(2, '0') + currentOrderId.substring(currentOrderId.lastIndexOf('-'));        
        ordenToUpdate.ID_de_Pedido__c = newOrderId;
        ordenToUpdate.Aprobado__c = true;
        ordenToUpdate.Mostrar_Env_o_a_Autorizaci_n__c = false;
        ordenToUpdate.Aprobado_Por__c = contactId;
        update ordenToUpdate;

        if(ordenToUpdate.Contacto__r.Email != null){
            List<String> emailAddresses = new List<String>();
            emailAddresses.add(ordenToUpdate.Contacto__r.Email);
            sendEmaiPreAutorizacion(ordenToUpdate.Id, ordenToUpdate.Contacto__c, emailAddresses);
        }

        return ordenToUpdate;
    }

    public static void sendEmaiPreAutorizacion(Id orderId, Id contactId, List<String> contactEmail){

        EmailTemplate et = [SELECT Id, Subject, Body FROM EmailTemplate WHERE Name = 'Respuesta Pre-Autorizacion'];

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

    // TO AUTHORIZE
    @AuraEnabled
    public static List<Order__c> getFilteredOrdersToAuthorize(String estatusNoOrdinario, Date fechaInicio, Date fechaFin){         
        List<Id> accountIdList = UserContactClass.getAccountIdsFromUser(); 
        return getOrdersToAuthorize(estatusNoOrdinario, accountIdList, fechaInicio, fechaFin);
    } 

    private static List<Order__c> getOrdersToAuthorize(String estatusNoOrdinario, List<Id> accountIdList, Date fechaInicio, Date fechaFin) {
        Datetime dateTimeFechaInicio = DateTime.newInstance(fechaInicio, Time.newInstance(0, 0, 0, 0));
        Datetime dateTimeFechaFin = DateTime.newInstance(fechaFin, Time.newInstance(23, 59, 59, 0));
        String tipoDePedidoExtraordinario = 'Extraordinario';
        String tipoModificado = 'Modificado';

        Set<Id> orderIdSet = new Set<Id>();
        List<Order_Line_Item__c> oliList = [
            SELECT Id, Order__c 
            FROM Order_Line_Item__c 
            WHERE Estatus_Aprobaci_n__c =: ESTATUS_APROBACION
                OR Estatus_Aprobaci_n__c =: tipoModificado
        ];

        for(Order_Line_Item__c oli : oliList){
            orderIdSet.add(oli.Order__c);
        }

        String orderQuery = 'SELECT Id, Name, CreatedDate, Folio_del_Pedido__c, Mostrar_Autorizaci_n__c, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, ' +
            'Fecha_de_Creacion__c, Estatus__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, ' +
            'Total_de_Claves_Aprobadas__c, Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, UMU__r.Clave_Presupuestal__c, ' +
            'UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, Aprobado_Por__c, Aprobado_Por__r.Name, ' +
            
            '(SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, ' +
                'Estatus_Aprobaci_n__c, Estatus_Autorizaci_n__c, Cantidad_Autorizada__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, ' +
                'Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, ' +
                'Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c, ' +
                'Product__r.Programa__r.Name ' +
            'FROM Order_Line_Items__r WHERE Estatus_Aprobaci_n__c =: ESTATUS_APROBACION OR Estatus_Aprobaci_n__c =: tipoModificado) ' + 

        'FROM Order__c ' + 
        'WHERE UMU__c IN: accountIdList' +
            ' AND Es_Programa__c = false' +
            ' AND Tipo_de_Pedido__c !=: TIPO_DE_PEDIDO_EXCENTO' +
            ' AND Tipo_de_Pedido__c !=: TIPO_DE_PEDIDO_NO_VALIDO' +
            ' AND Aprobado__c = true' +
            ' AND CreatedDate >=: dateTimeFechaInicio' +
            ' AND CreatedDate <=: dateTimeFechaFin' +
            // ' AND Tipo_de_Pedido__c =: tipoDePedidoExtraordinario' + 
            ' AND Id IN: orderIdSet';
        // return Database.query(orderQuery);


        List<Order__c> orderList = Database.query(orderQuery);         
        List<Order__c> filteredOrderList = new List<Order__c>();
        for(Order__c ord : orderList){
            if(ord.Order_Line_Items__r.size()>0){
                for(Order_Line_Item__c oli : ord.Order_Line_Items__r){
                    if(oli.Estatus_Autorizaci_n__c == estatusNoOrdinario || (oli.Estatus_Autorizaci_n__c == 'Modificado' && estatusNoOrdinario != 'Pendiente')){
                        filteredOrderList.add(ord);
                        break;
                    }
                }
            }
        }
        return filteredOrderList;
    }  

    @AuraEnabled
    public static List<Order__c> updateOrderLineItemToAuthorize(Id orderLineId, String actionType, Integer quantity, String message){ 
        
        String tipoModificado = 'Modificado';

        List<Order__c> orderWithRelatedOLI = new List<Order__c>();

        List<Order_Line_Item__c> oliList = [
            SELECT Id, Name, Estatus__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Tipo_de_Pedido__c, Order__c, Dispobible_a_Solicitar__c,
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

        Integer cantidadRechazada = Integer.valueOf(oliToUpdate.Cantidad_Solicitada__c) - quantity;
        oliToUpdate.Estatus_Autorizaci_n__c = actionType;
        oliToUpdate.Cantidad_Autorizada__c = quantity;
        oliToUpdate.Autorizaci_n_Cantidad_Rechazada__c = cantidadRechazada;
        oliToUpdate.Motivo_No_Autorizaci_n__c = message; 

        try{
            update oliToUpdate;
        }catch(DMLException e){
            System.debug(e.getMessage());
            return orderWithRelatedOLI;
        }  

        // if(actionType == 'Modificado'){
        //     Order_Line_Item__c oliToReject = new Order_Line_Item__c();

        //     Integer cantidadRechazada = Integer.valueOf(oliToUpdate.Cantidad_Solicitada__c) - quantity;
        //     oliToReject.Order__c = oliToUpdate.Order__c;
        //     oliToReject.Product__c = oliToUpdate.Product__c;
        //     oliToReject.L_mite_Mensual_DPN__c = oliToUpdate.L_mite_Mensual_DPN__c;
        //     oliToReject.Consumido_DPN__c = oliToUpdate.Consumido_DPN__c;
        //     oliToReject.Existencia_en_UMU__c = oliToUpdate.Existencia_en_UMU__c;
        //     oliToReject.Disponible_en_CENADI__c = oliToUpdate.Disponible_en_CENADI__c;
        //     oliToReject.Cantidad_Solicitada__c = oliToUpdate.Cantidad_Solicitada__c;
        //     oliToReject.Cantidad_de_Piezas__c = oliToUpdate.Cantidad_de_Piezas__c;
        //     oliToReject.Costo__c = oliToUpdate.Costo__c;
        //     oliToReject.Estatus_Aprobaci_n__c = 'Rechazado';
        //     oliToUpdate.Cantidad_Aprobada__c = quantity;
        //     oliToReject.Cantidad_Rechazada__c = cantidadRechazada;
        //     oliToReject.Motivo_No_Aprobaci_n__c = message; 
        //     try{
        //         insert oliToReject;
        //     }catch(DMLException e){
        //         System.debug(e.getMessage());
        //         return orderWithRelatedOLI;
        //     } 

        //     oliToUpdate.Estatus_Aprobaci_n__c = 'Aprobado';
        //     oliToUpdate.Cantidad_Aprobada__c = quantity;
        //     oliToReject.Cantidad_Rechazada__c = cantidadRechazada;
        //     oliToUpdate.Motivo_No_Aprobaci_n__c = message; 
        //     try{
        //         update oliToUpdate;
        //     }catch(DMLException e){
        //         System.debug(e.getMessage());
        //         return orderWithRelatedOLI;
        //     } 
        // } else{
        //     oliToUpdate.Estatus_Autorizaci_n__c = actionType;
        //     oliToUpdate.Cantidad_Autorizada__c = quantity;
        //     oliToUpdate.Motivo_No_Aprobaci_n__c = message;  
        //     try{
        //         update oliToUpdate;
        //     }catch(DMLException e){
        //         System.debug(e.getMessage());
        //         return orderWithRelatedOLI;
        //     }  
        // }

        orderWithRelatedOLI = [
            SELECT Id, Name, ID_de_Pedido__c, Mostrar_Autorizaci_n__c, Mostrar_Env_o_a_Autorizaci_n__c, Estatus_No_Ordinario__c, Folio_Control__c, Fecha_de_Creacion__c, Estatus__c, 
                Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Numero_de_Oficio__c, 
                Total_de_Claves_Aprobadas__c, Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, 
                UMU__r.Clave_Presupuestal__c, UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c, 
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, 
                    Estatus_Autorizaci_n__c, Motivo_No_Autorizaci_n__c, Cantidad_Autorizada__c, Autorizaci_n_Cantidad_Rechazada__c, 
                    Costo__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Product__r.Name, Product__r.Product_Code_ID__c, 
                    Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                    Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c,
                    Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name 
                FROM Order_Line_Items__r WHERE Estatus_Aprobaci_n__c =: ESTATUS_APROBACION OR Estatus_Aprobaci_n__c =: tipoModificado)
            FROM Order__c
            WHERE Id =: oliToUpdate.Order__c
            LIMIT 1
        ];

        if(actionType == 'Autorizado' || actionType == 'Modificado'){
            orderWithRelatedOLI[0].Mostrar_Autorizaci_n__c = true;
            update orderWithRelatedOLI;
        }

        return orderWithRelatedOLI;
    }  

    @AuraEnabled
    public static Order__c updateAuthorizationIdDePedidoFromOrder(Id orderId){

        Id contactId = UserContactClass.getContactIdFromUser(); 

        Order__c ordenToUpdate = new Order__c();

        List<Order__c> order = [
            SELECT Id, Name, CreatedDate, Folio_del_Pedido__c, ID_de_Pedido__c, Estatus_No_Ordinario__c, Folio_Control__c, 
                Fecha_de_Creacion__c, Estatus__c, Mostrar_Autorizaci_n__c, Mostrar_Env_o_a_Autorizaci_n__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Contacto__c, Contacto__r.Name, Contacto__r.Email, Numero_de_Oficio__c, 
                Total_de_Claves_Aprobadas__c, Total_de_Piezas__c, Costo_Total__c, UMU__c, UMU__r.Estado__c, UMU__r.Name, UMU__r.Clave_Presupuestal__c, 
                UMU__r.Delegacion__c, UMU__r.Tipo_UMU__c, UMU__r.UMU__c,
                (SELECT Id, Estatus__c, Cantidad_Solicitada__c, Estatus_Autorizaci_n__c, Dispobible_a_Solicitar__c, Disponible_en_CENADI__c, Existencia_en_UMU__c, Cantidad_Aprobada__c, 
                    Estatus_Aprobaci_n__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, L_mite_Mensual_DPN__c, Consumido_DPN__c, 
                    Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Description__c, 
                    Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c,
                    Product__r.Programa__r.Name
                FROM Order_Line_Items__r)
            FROM Order__c
            WHERE Id =: orderId
            LIMIT 1 
        ];

        if(order.isEmpty()){
            return ordenToUpdate; 
        } 

        ordenToUpdate = order[0];

        String currentOrderId = ordenToUpdate.ID_de_Pedido__c;
        Integer lastTwoDigits = Integer.valueOf(currentOrderId.substring(currentOrderId.length() - 2)) + 1;
        String newOrderId = currentOrderId.substring(0, currentOrderId.length() - 2) + String.valueOf(lastTwoDigits).leftPad(2, '0');
        ordenToUpdate.ID_de_Pedido__c = newOrderId;
        ordenToUpdate.Autorizado__c = true;
        ordenToUpdate.Mostrar_Autorizaci_n__c = false;
        ordenToUpdate.Aprobado_Por__c = contactId;
        update ordenToUpdate;

        if(ordenToUpdate.Contacto__r.Email != null){
            List<String> emailAddresses = new List<String>();
            emailAddresses.add(ordenToUpdate.Contacto__r.Email);
            sendEmaiPreAutorizacion(ordenToUpdate.Id, ordenToUpdate.Contacto__c, emailAddresses);
        }

        return ordenToUpdate;
    }


    // -------------------------- CAN BE AND WILL BE REFACTORED --------------------------


}