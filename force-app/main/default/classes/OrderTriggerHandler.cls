public class OrderTriggerHandler { 
    public static void orderBeforeUpdateHandler(List<Order__c> newOrderList, Map<Id, Order__c> oldOrderMap){
    	OrderFields.updateSeguimiento(newOrderList, oldOrderMap); 
    }
    
    public static void orderAfterUpdateHandler(List<Order__c> newOrderList, Map<Id, Order__c> oldOrderMap){
    	OrderFields.updateDates(newOrderList, oldOrderMap); 
    }
}