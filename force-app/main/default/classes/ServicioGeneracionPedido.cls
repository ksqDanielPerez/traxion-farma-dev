/**
 * 
 * @description La clase ServicioGeneracionPedido es responsable de realizar llamadas a la API externa
 * Traxion Albatros para gestionar pedidos en Salesforce. La clase permite la creación de pedidos
 * utilizando la API y devuelve la respuesta en un objeto de tipo RespuestaTraxionWrapper.
 * 
 * La clase contiene clases anidadas para representar el esquema de la solicitud y la respuesta de la API,
 * así como métodos para manejar la creación de pedidos.
 *
 */

public class ServicioGeneracionPedido {
    
    private static final String METODO_POST = 'POST';
    private static final String TIPO_CONTENIDO_CABECERA = 'Content-Type';
    private static final String TIPO_CONTENIDO_CABECERA_JSON = 'application/json';
    private static final String API_BASE_URL;
    public static final String API_RUTA = '/api/shipments/order?customer_name=ISSTE';
    @testVisible
	private static final String AUTORIZACION_NOMBRE_CABECERA = 'Authorization';
    
    static {
        MuleSoft_Integration_Settings__mdt settings =  [SELECT Api_Base_Url__c 
                                                        FROM  MuleSoft_Integration_Settings__mdt 
                                                        WHERE DeveloperName = 'Traxion'];
        API_BASE_URL = settings.Api_Base_Url__c;
    }
    
    public static RespuestaTraxionWrapper crearPedido(List<Envio> envios) { 
        String apiUrl = API_BASE_URL + API_RUTA;

        HttpRequest pedido = new HttpRequest();
        pedido.setEndpoint(apiUrl);
        pedido.setMethod(METODO_POST);
        pedido.setHeader(TIPO_CONTENIDO_CABECERA, TIPO_CONTENIDO_CABECERA_JSON);
        pedido.setHeader(AUTORIZACION_NOMBRE_CABECERA, 'Bearer ' + AutorizacionMuleSoft.CABECERA_DE_AUTORIZACION.get(AUTORIZACION_NOMBRE_CABECERA));
        pedido.setBody(JSON.serialize(new Map<String, List<Envio>>{ 'shipments' => envios }));

        HttpResponse respuesta = new Http().send(pedido);
        if (respuesta.getStatusCode() != 200) { 
            throw new CalloutException('Error al crear pedido. Código de estado: ' + respuesta.getStatusCode() + ', Mensaje: ' + respuesta.getBody());
        }
        
        return (RespuestaTraxionWrapper) JSON.deserialize(respuesta.getBody(), RespuestaTraxionWrapper.class);
    }
    
    public class Envio {
        public String client_id;
        public String external_id;
        public String document_number;
        public String early_delivery_date;
        public String early_ship_date;
        public String late_delivery_date;
        public String late_ship_date;
        public String remision;
        public String shipment_number;
        public String entered_date;
        public String ship_address;
        public String customer_date;
        public String order_type;
        public String change_carrier;
        public String release_remaining;
        public String customer_number;
        public String bto_rush;
        public List<Item> items;
    }

    public class Item {
        public String order_line {get;set;}
        public String order_sub {get;set;}
        public String entered_date {get;set;}
        public String product_number {get;set;}
        public String ordered_quantity {get;set;}
        public String process_priority {get;set;}
        public String partial_flag {get;set;}
        public String back_order {get;set;}
        public String cross_dock {get;set;}
        public String quantity_ordered {get;set;}
        public String split_case {get;set;}
        public String order_inventory {get;set;}
        public String assignment_profile {get;set;}
        public String freshness_date_flag {get;set;}
        public String unit_price {get;set;}
        public String plan_number {get;set;}
        public String currency_name {get;set;}
    }
    
    public class RespuestaTraxionWrapper {
        public RespuestaTraxion traxion_response;
    }
    
    public class RespuestaTraxion {
        public String completed_succesfully;
        public Respuesta response;
    }

    public class Respuesta {
        public String message;
        public Map<String, Object> data;
    }
}