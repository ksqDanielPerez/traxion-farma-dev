public without sharing class SendEmail {
    
    public class DataSummary {
        @AuraEnabled
        public Integer numItems { get; set; }
        @AuraEnabled
        public Integer numCantidadUmus { get; set; }
        @AuraEnabled
        public Decimal sumCantidadAutorizada { get; set; }
        
        public DataSummary(Integer numItems, Integer numCantidadUmus, Decimal sumCantidadAutorizada) {
            this.numItems = numItems;
            this.numCantidadUmus = numCantidadUmus;
            this.sumCantidadAutorizada = sumCantidadAutorizada;
        }
    }
    
    // Create attachments
    private static List<Messaging.EmailFileAttachment> createEmailAttachments(List<ContentVersion> listContentVersion) {
        List<Messaging.EmailFileAttachment> listAttachment = new List<Messaging.EmailFileAttachment>();
        
        for (ContentVersion content : listContentVersion) {
            Messaging.EmailFileAttachment attachment = new Messaging.EmailFileAttachment();
            attachment.setFileName(content.Title);
            attachment.setBody(content.VersionData);
            listAttachment.add(attachment);
        }
        
        return listAttachment;
    }
    
    public static void sendEmailWithAttachments(List<ContentVersion> listContentVersion, String correoElectronico) {
		List<Messaging.EmailFileAttachment> listAttachment = createEmailAttachments(listContentVersion);
    
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setSubject('Files');
        email.setPlainTextBody('Probando si funciona.');
        email.setToAddresses(new List<String>{correoElectronico});
        email.setFileAttachments(listAttachment);
    
        Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[]{email});
    }
    
    public static void sendOrdinaryEmail(List<ContentVersion> listContentVersion, String correoElectronico) {
        List<Messaging.EmailFileAttachment> listAttachment = createEmailAttachments(listContentVersion);
        
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setSubject('Files');
        email.setPlainTextBody('Probando si funciona.');
        email.setToAddresses(new List<String>{correoElectronico});
        email.setFileAttachments(listAttachment);
        
        Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[]{email});
    }
    
    public static void sendTemplateEmailWithAttachments(List<ContentVersion> listContentVersion, String correoElectronico, Order__c order, Account umu) {
        List<Messaging.EmailFileAttachment> listAttachment = createEmailAttachments(listContentVersion);
        
        EmailTemplate template = [
            SELECT Id, HtmlValue, Body, Subject, DeveloperName
            FROM EmailTemplate
            WHERE DeveloperName = 'Confirmacion_de_Solicitud_de_Pedido_UMU'
        ];
        
        system.debug('Send Email');
        system.debug(order);
        system.debug(umu);
        system.debug(correoElectronico);
        
        String htmlBody = template.HtmlValue;
        htmlBody = htmlBody.replace('{TIPO_DE_PEDIDO}', order.Tipo_de_Pedido__c);
        //htmlBody = htmlBody.replace('{ID_PEDIDO}', order.ID_de_Pedido__c);
        
        String body = template.Body;
        body = body.replace('{TIPO_DE_PEDIDO}', order.Tipo_de_Pedido__c);
        //body = body.replace('{ID_PEDIDO}', order.ID_de_Pedido__c);
        
        String subject = template.Subject;
        subject = subject.replace('{TIPO_DE_PEDIDO}', order.Tipo_de_Pedido__c);
        //subject = subject.replace('{ID_PEDIDO}', order.ID_de_Pedido__c);
        subject = subject.replace('{NOMBRE_UMU}', umu.Name);
		subject = subject.replace('{CLAVE_PRESUPUESTAL}', umu.Clave_Presupuestal__c);        
        
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setSubject(subject);
        email.setHtmlBody(htmlBody);
        email.setPlainTextBody(body);
        email.setToAddresses(new List<String>{correoElectronico});
        email.setFileAttachments(listAttachment);
        
        Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[]{email});
    }
    
    public static void sendProgramEmailWithAttachments(List<ContentVersion> listContentVersion, String correoElectronico, String summaryJson, Order__c order, String programName) {
        List<Messaging.EmailFileAttachment> listAttachment = createEmailAttachments(listContentVersion);
        
        EmailTemplate template = [
            SELECT Id, HtmlValue, Body, Subject, DeveloperName
            FROM EmailTemplate
            WHERE DeveloperName = 'Confirmacion_de_Solicitud_de_Pedido'
        ];
        
        system.debug('Send Email 2');
        system.debug(order);
        system.debug(correoElectronico);
        
        DataSummary dataSummary = (DataSummary) JSON.deserialize(summaryJson, DataSummary.class);
        
        system.debug('summary');
        system.debug(dataSummary);
        
        String htmlBody = template.HtmlValue;
        //String folio = order.ID_de_Pedido__c;
		htmlBody = htmlBody.replace('{CANTIDAD_DE_CLAVES_SOLICITADAS}', String.valueOf(dataSummary.numItems));
		htmlBody = htmlBody.replace('{CANTIDAD_DE_UNIDADES_MEDICAS}', String.valueOf(dataSummary.numCantidadUmus));
        htmlBody = htmlBody.replace('{CANTIDAD_DE_PIEZAS_SOLICITADAS}', String.valueOf(dataSummary.sumCantidadAutorizada));
        htmlBody = htmlBody.replace('{TIPO_DE_PEDIDO}', order.Tipo_de_Pedido__c);
        htmlBody = htmlBody.replace('{FECHA_DE_CARGA}', String.valueOf(order.Fecha_de_Creacion__c));
        //htmlBody = htmlBody.replace('{NUMERO_DE_FOLIO}', folio.substring(0,5));
        htmlBody = htmlBody.replace('{NOMBRE_DEL_PROGRAMA}', programName);
        
        String body = template.Body;
        
        String subject = template.Subject;
        subject = subject.replace('{TIPO_DE_PEDIDO}', order.Tipo_de_Pedido__c);
        //subject = subject.replace('{NUMERO_DE_FOLIO}', folio.substring(0,5));
        subject = subject.replace('{NOMBRE_DEL_PROGRAMA}', programName);   
        
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setSubject(subject);
        email.setHtmlBody(htmlBody);
        email.setPlainTextBody(body);
        email.setToAddresses(new List<String>{correoElectronico});
        email.setFileAttachments(listAttachment);
        
        Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[]{email});
    }
}