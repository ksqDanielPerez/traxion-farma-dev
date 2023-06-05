trigger OrderTrigger on Order__c (before update, after update) {
    switch on Trigger.operationType {
        when BEFORE_UPDATE {
            OrderTriggerHandler.orderBeforeUpdateHandler(Trigger.new, Trigger.oldMap);
            OrderTriggerHandler.orderAfterUpdateHandler(Trigger.new, Trigger.oldMap);
        }

        when AFTER_UPDATE {
            OrderTriggerHandler.orderAfterUpdateDeliveryHandler(Trigger.new, Trigger.oldMap);
        }
    }
}