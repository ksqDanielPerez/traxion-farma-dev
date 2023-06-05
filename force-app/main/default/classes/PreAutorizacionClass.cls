public without sharing class PreAutorizacionClass {

    // private String ordenId {get;set;}

    private String pedidoId {get;set;}
    public Pedido__c pedido {get;set;}

    private List<Id> listaProductos {get;set;}

    public Order__c orden {get;set;}

    

    public Account umu {get;set;}
    public Contact contact {get;set;}
    public List<Product2> productos {get;set;}
    public String idSubalmacen{get;set;}

    public PreAutorizacionClass() {
 
        try{ 
            pedidoId = ApexPages.currentPage().getParameters().get('id'); 
        } catch(Exception e){
            System.debug(e.getMessage());
        } 
        
        try{
            pedido = [
                SELECT Id, ID_de_Pedido__c, Tipo_de_Pedido__c, CreatedDate, UMU__c, Creado_Por__c, Aprobado_Por__c, Aprobado_Por__r.Name, 
                    Autorizado_Por__c, Autorizado_Por__r.Name, Fecha_Revision_Delegacion__c, Fecha_Revision_SICORA__c
                FROM Pedido__c 
                WHERE Id =: pedidoId 
                LIMIT 1
            ];
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(pedido);

        try{
            umu = [
                SELECT Id, Name, Ciudad__c, Calle__c, Colonia__c, Delegacion__c, Estado__c, Tipo_UMU__c, Clave_Presupuestal__c, UMU__c 
                FROM Account 
                WHERE Id =: pedido.UMU__c 
                LIMIT 1
            ];
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(umu);

        try{
            contact = [
                SELECT Id, Name 
                FROM Contact 
                WHERE Id =: pedido.Creado_Por__c
            ];
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(contact);

        try{ 
            String urlProductos = (ApexPages.currentPage().getParameters().get('listaProductos')); 
            listaProductos = new List<String>(urlProductos.split(','));  
            productos = [
                SELECT Id, Product_Code_ID__c, Name, 
                    (SELECT Id, Name, Product__c, Order__c, Cantidad_Solicitada__c, Cantidad_Aprobada__c, Cantidad_Autorizada__c,
                        Estatus_Aprobaci_n__c, Estatus_Autorizaci_n__c, Motivo_No_Aprobaci_n__c, Motivo_No_Autorizaci_n__c
                     FROM Order_Line_Items__r
                     WHERE Pedido__c =: pedidoId LIMIT 1) 
                FROM Product2 
                WHERE Id IN: listaProductos
            ]; 
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(productos);
    }
}