trigger OrderTrigger on Order__c (before update) {
    switch on Trigger.operationType {
        when BEFORE_UPDATE { 
            OrderTriggerHandler.orderBeforeUpdateHandler(Trigger.new, Trigger.oldMap);
            OrderTriggerHandler.orderAfterUpdateHandler(Trigger.new, Trigger.oldMap);
        }
    }
}