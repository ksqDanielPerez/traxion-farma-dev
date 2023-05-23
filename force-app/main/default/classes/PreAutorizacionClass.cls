public without sharing class PreAutorizacionClass {

    private String ordenId {get;set;}
    private List<Id> listaProductos {get;set;}
    public Order__c orden {get;set;}
    public Account umu {get;set;}
    public Contact contact {get;set;}
    public List<Product2> productos {get;set;}
    public String idSubalmacen{get;set;}

    public PreAutorizacionClass() {

        System.debug('PRINTING PRE AUTORIZATION CLASS');
        try{
            ordenId = ApexPages.currentPage().getParameters().get('id');
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(ordenId);
        
        try{
            orden = [
                SELECT Id, Contacto__r.FirstName, UMU__c, Folio_del_Pedido__c, Tipo_de_Pedido__c, ID_de_Pedido__c, CreatedDate, 
                    Aprobado_Por__c, Fecha_Revision_Delegacion__c
                FROM Order__c 
                WHERE Id =: ordenId 
                LIMIT 1
            ];
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(orden.ID_de_Pedido__c);
        System.debug(orden.Tipo_de_Pedido__c);
        System.debug(orden.CreatedDate);

        try{
            umu = [
                SELECT Id, Name, Ciudad__c, Calle__c, Colonia__c, Delegacion__c, Estado__c, Tipo_UMU__c, Clave_Presupuestal__c, UMU__c 
                FROM Account 
                WHERE Id =: orden.UMU__c 
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
                WHERE Id =: orden.Contacto__c
            ];
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(contact);

        try{
            String urlProductos = (ApexPages.currentPage().getParameters().get('listaProductos'));
            idSubalmacen = (ApexPages.currentPage().getParameters().get('idsubalmacen'));
            listaProductos = new List<String>(urlProductos.split(','));

            productos = [
                SELECT Id, Product_Code_ID__c, Name 
                FROM Product2 
                WHERE Id IN: listaProductos
            ];
        } catch(Exception e){
            System.debug(e.getMessage());
        }
        System.debug(productos);
    }
}