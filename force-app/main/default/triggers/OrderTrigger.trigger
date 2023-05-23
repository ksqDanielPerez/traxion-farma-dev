trigger OrderTrigger on Order__c (before insert, before update, after insert) {
    switch on Trigger.operationType {
        when BEFORE_INSERT { 
            OrderTriggerHandler.orderBeforeInsertHandler(Trigger.new);
        } 
        
        when AFTER_INSERT { 
            OrderTriggerHandler.orderAfterInsertHandler(Trigger.new);
        } 
    }
}