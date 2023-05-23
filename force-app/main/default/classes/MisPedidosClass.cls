public with sharing class MisPedidosClass {
    @AuraEnabled
    public static List<Order__c> getFilteredOrders(Date fechaInicio, Date fechaFin){         
        // List<Id> accountIdList = UserContactClass.getAccountIdsFromUser(); 
        Id contactId = UserContactClass.getContactIdFromUser();

        return getOrders(contactId, fechaInicio, fechaFin);
    } 

    private static List<Order__c> getOrders(Id contactId, Date fechaInicio, Date fechaFin) {
        Datetime dateTimeFechaInicio = DateTime.newInstance(fechaInicio, Time.newInstance(0, 0, 0, 0));
        Datetime dateTimeFechaFin = DateTime.newInstance(fechaFin, Time.newInstance(23, 59, 59, 0));
        
        String orderQuery = 'SELECT Id, Name, CreatedDate, Total_de_Claves_Solicitadas__c, Cantidad_Total_de_Piezas__c, ID_de_Pedido__c, Fecha_de_Creacion__c, ' +
            'Estatus__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, Entrega__c, Entrega__r.Name, Aprobado_Por__c, Aprobado_Por__r.Name, ' +
            'Contacto__c, Contacto__r.Name, Total_de_Claves_Aprobadas__c, UMU__c, Total_de_Piezas__c, Costo_Total__c, UMU__r.Name, UMU__r.Estado__c, UMU__r.Colonia__c, UMU__r.Delegacion__c, UMU__r.Clave_Presupuestal__c, ' +
            '(SELECT Id, Estatus__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Cantidad_de_Piezas__c, Costo__c, Account__r.Name, Account__r.Clave_Presupuestal__c, Account__r.Estado__c, ' +
                'Product__r.Name, Product__r.Product_Code_ID__c, Product__r.Subalmacen__c, Product__r.Subalmacen__r.Name, Product__r.Subalmacen__r.Numero_de_Subalmacen__c, Product__r.Programa__c, Product__r.Programa__r.Inventario__c, Product__r.Programa__r.Programa_ID__c, Product__r.Programa__r.Name FROM Order_Line_Items__r) ' +
        'FROM Order__c ' + 
        'WHERE Contacto__c =: contactId' +
            ' AND CreatedDate >=: dateTimeFechaInicio' +
            ' AND CreatedDate <=: dateTimeFechaFin' + 
            ' ORDER BY CreatedDate DESC';
        return Database.query(orderQuery); 
    } 
}