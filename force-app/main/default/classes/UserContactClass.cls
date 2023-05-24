public with sharing class UserContactClass {
    
    private static final String RESPONSABLE_DE_FARMACIA = 'Responsable_de_Farmacia_y_o_Almac_n';
    private static final String ESTATUS_ACTIVO = 'Activo';
    private static final String RDF_MEDICINA = 'MEDICINE';
    private static final String RDF_MATERIAL_DE_CURACION = 'HEALING MATERIAL';

    public static Id getUserId(){  
        try {
            Id currentUserId = UserInfo.getUserId(); 
            return currentUserId;
        } catch(Exception e){
            System.debug(e.getMessage());
            return null;
        }
    } 

    public static Id getContactIdFromUser(){  
        Id currentUserId = getUserId();
        try { 
            User currentUser = [
                SELECT ContactId 
                FROM User 
                WHERE Id =: currentUserId 
                LIMIT 1]; 
            return currentUser.ContactId;
        } catch(Exception e){
            System.debug(e.getMessage());
            return null;
        }
    }

    public static Boolean checkIfUserIsResponsableDeFarmaciaAlmacen(){    
        Id userId = getUserId();  
        try {
            List<PermissionSetAssignment> psaList = [
                SELECT PermissionSet.Name
                FROM PermissionSetAssignment
                WHERE AssigneeId =: userId
                    AND PermissionSet.Name =: RESPONSABLE_DE_FARMACIA
            ];
            return !psaList.isEmpty();
        } catch (Exception e) {
            System.debug(e.getMessage());
            return false;
        } 
    }

    public static List<Id> getAccountIdsFromUser(){   
        Id contactId = getContactIdFromUser();   
        List<Id> accountIdList = new List<Id>();
        try {
            List<AccountContactRelation> accountContactList = [
                SELECT AccountId, Account.Name  
                FROM AccountContactRelation 
                WHERE ContactId =: contactId
            ];  
            for(AccountContactRelation accConRel : accountContactList){
                accountIdList.add(accConRel.AccountId);
            }
            return accountIdList;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            return accountIdList;
        }
    }

    public static List<Id> getProgramIdsByContact() {
        Id contactId = getContactIdFromUser();
        List<Id> programsIdList = new List<Id>();
        try {
            List<Contactos_y_Programas__c> contactProgramsList = [
                SELECT Id, Contact__c, Programa__c 
                FROM Contactos_y_Programas__c
                WHERE Contact__c = :contactId
            ];
            for(Contactos_y_Programas__c cp : contactProgramsList) {
                programsIdList.add(cp.Programa__c);
            }
            return programsIdList;
        } catch (Exception e) {
            System.debug('Query error: ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    public static List<Account> getAccountListFromUser(){  
        List<Id> accountIdList = getAccountIdsFromUser(); 
        List<Account> accountList = new List<Account>();
        try {
            accountList = [
                SELECT Id, Name, Clave_Presupuestal__c, UMU__c, Tipo_UMU__c, UMU_Cerrada__c, Delegacion__c
                FROM Account 
                WHERE Id IN: accountIdList
            ];  
            return accountList;
        } catch (Exception e) {
            System.debug('Error: ' + e.getMessage());
            return accountList;
        }
    }

    @AuraEnabled(cacheable=true)    
    public static List<DPN_Line_Item__c> getActiveDPNListFromUser(Id accountId){  
        List<DPN_Line_Item__c> dpnLineItem = new List<DPN_Line_Item__c>();

        Boolean userIsResponsableDeFarmacia = checkIfUserIsResponsableDeFarmaciaAlmacen();

        Id contactId = getContactIdFromUser();

        // Obtener DPN relacionada e items 
        List<DPN__c> dpnActivo = [
            SELECT Id, Name 
            FROM DPN__c 
            WHERE Account__c =: accountId
                AND Estatus__c =: ESTATUS_ACTIVO
                LIMIT 1
        ]; 

        if(dpnActivo.size() == 0){
            return dpnLineItem;
        }

        Id dpnActivoId = dpnActivo[0].Id;
        String dpnLineItemQuery = 'SELECT Id, Name, DPN__c, L_mite_Mensual__c, Consumido__c, Product__r.Product_Code_ID__c, Product__r.Name';
        dpnLineItemQuery += ' FROM DPN_Line_Item__c';
        dpnLineItemQuery += ' WHERE DPN__c =: dpnActivoId'; 
         
        if(userIsResponsableDeFarmacia){ 
            Contact con = [
                SELECT Id, Name, Acceso_a_claves_por_clasificaci_n__c
                FROM Contact
                WHERE Id =: contactId
                    LIMIT 1
            ]; 
            String limiteDeResponsableDeFarmacia = '';
            String accesoaClavesPorClasificacion = con.Acceso_a_claves_por_clasificaci_n__c;
            switch on accesoaClavesPorClasificacion {
                when 'Medicina' {
                    limiteDeResponsableDeFarmacia = RDF_MEDICINA;
                }
                when 'Material de Curación' {
                    limiteDeResponsableDeFarmacia = RDF_MATERIAL_DE_CURACION;
                }
                when else {
                    limiteDeResponsableDeFarmacia = '';
                }
            }
            if(String.isNotBlank(limiteDeResponsableDeFarmacia)){
                dpnLineItemQuery += ' AND Product__r.Simple_Classification__c =: limiteDeResponsableDeFarmacia'; 
            } 
        }

        dpnLineItem = Database.query(dpnLineItemQuery); 
        return dpnLineItem;
    } 

    @AuraEnabled
    public static String getDisponibilidadSkus(String jsonData){
        List<String> skus = (List<String>) JSON.deserialize(jsonData, List<String>.class);
        return JSON.serialize(ServicioPaqueteo.obtenerDisponibilidad(skus));
    }

    @AuraEnabled
    public static String checkGeneracionDePedido(String jsonData){
        

        List<ServicioGeneracionPedido.Envio> enviosList = new List<ServicioGeneracionPedido.Envio>();

        ServicioGeneracionPedido.Envio envio = new ServicioGeneracionPedido.Envio();
        
        // envio.client_id = '123';
        // envio.external_id = 'ABC'; 
        // List<ServicioGeneracionPedido.Item> items = new List<ServicioGeneracionPedido.Item>();
        // ServicioGeneracionPedido.Item item = new ServicioGeneracionPedido.Item();
        // item.order_line = '1';
        // item.product_number = 'XYZ';
        // items.add(item);
        // envio.items = items;
        enviosList.add(envio);

        // String response = JSON.serialize(ServicioGeneracionPedido.crearPedido(enviosList));
        // System.debug(response);

        return JSON.serialize(ServicioGeneracionPedido.crearPedido(enviosList));
    }

}