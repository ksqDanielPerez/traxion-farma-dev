public class OrderTriggerHandler { 
    public static void orderBeforeInsertHandler(List<Order__c> orderList){
    	OrderFields.insertIdDePedido(orderList); 
    }
    
    public static void orderAfterInsertHandler(List<Order__c> orderList){ 
        OrderFields.insertFechaMaximaDeEntrega(orderList);
    }
}