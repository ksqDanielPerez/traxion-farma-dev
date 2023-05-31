public class OrderFields { 
	public static void updateSeguimiento(List<Order__c> newOrderList, Map<Id, Order__c> oldOrderList){
        for(Order__c ord : newOrderList){
            if(Trigger.isUpdate && ord.Estatus__c != null && ord.Estatus__c != oldOrderList.get(ord.Id).Estatus__c){
                Map<String, String> seguimientoMap = !String.isBlank(ord.Seguimiento__c) 
                	? (Map<String, String>)JSON.deserialize(ord.Seguimiento__c, Map<String, String>.class) 
                	: new Map<String, String>();
            
            	String payload = 'Fecha:' + String.valueOf(Datetime.now());
                
                if( ord.Estatus__c == 'En Firma' && oldOrderList.get(ord.Id).Estatus__c == 'Enviado'){
                	List<Contact> contact = [
                        SELECT Id, Name 
                        FROM Contact
                        WHERE Id =: ord.Contacto__c
                        LIMIT 1
                    ];
                    
                    if(!contact.isEmpty()){
                        payload += ';Firmado:' + String.valueOf(contact[0].Name);
                        //seguimientoMap.put('Firmado', String.valueOf(contact[0].Name));
                    }  
                } 
                
                seguimientoMap.put(ord.Estatus__c, payload);
                ord.Seguimiento__c = JSON.serialize(seguimientoMap);
            }
        } 
    }
    
    public static void updateDates(List<Order__c> newOrderList, Map<Id, Order__c> oldOrderList) {
        for(Order__c ord : newOrderList) {
            if(Trigger.isUpdate && ord.Estatus__c != null && ord.Estatus__c != oldOrderList.get(ord.Id).Estatus__c) {
                String seguimientoJson = ord.Seguimiento__c;
                
                Map<String, Object> seguimientoMap = (Map<String, Object>) JSON.deserializeUntyped(seguimientoJson);
                
                String enFirma = (String) seguimientoMap.get('En Firma');
                
                if(enFirma != null && enFirma != '') {
                    String enFirmaValue = enFirma.substring(6, 24);
                    DateTime enFirmaDatetime;
                    if (enFirmaValue != null) {
                        try {
                            enFirmaDatetime = DateTime.valueOf(enFirmaValue);
                            ord.Fecha_de_certificacion_de_la_remision__c = enFirmaDatetime;
                        } catch (Exception e) {
                            System.debug('Error dentro del try: ' + e.getMessage());
                            //enFirmaDatetime = null;
                        }
                    } else {
                        enFirmaDatetime = null;
                    }
                }
            }
        }
    }
}