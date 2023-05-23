public with sharing class ImagesPageController {
    
    @AuraEnabled
    public static List<Order__c> getImageRecords(List<String> clavesSeleccionadas, List<String> umusSeleccionadas, List<String> estadosSeleccionados, List<String> pedidosSeleccionados, List<String> transportesSeleccionados, Date fechaInicio, Date fechaFin) {
        return MisPedidosClass.getFilteredOrders(clavesSeleccionadas, umusSeleccionadas, estadosSeleccionados, pedidosSeleccionados, transportesSeleccionados, fechaInicio, fechaFin);
    }


    // @AuraEnabled
    // public static List<ImageResponse> getImageRecords() {
    //     try {
    //         HttpRequest httpRequest = new HttpRequest();
    //         httpRequest.setMethod('GET');
    //         httpRequest.setEndpoint('callout:ImagesEndpoint');
    //         Http http = new Http();
    //         HttpResponse httpResponse = http.send(httpRequest);
    //         return (List<ImageResponse>) JSON.deserialize(httpResponse.getBody(), List<ImageResponse>.class);
    //     } catch (Exception ex) {
    //         throw new AuraHandledException(ex.getMessage());
    //     }
    // }
 
    public class ImageResponse {
        @AuraEnabled
        public Integer albumId { get; set; }
        @AuraEnabled
        public Integer id { get; set; }
        @AuraEnabled
        public String title { get; set; }
        @AuraEnabled
        public String url { get; set; }
        @AuraEnabled
        public String thumbnailUrl { get; set; }
    }
}