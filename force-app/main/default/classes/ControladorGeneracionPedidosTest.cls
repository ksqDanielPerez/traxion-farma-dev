@isTest
public with sharing class ControladorGeneracionPedidosTest {
  @TestSetup
  static void testDataFactory() {
    // Create test data

    Account acc = new Account(
      Name = 'Calienta Aguas',
      Clave_Presupuestal__c = '00120409',
      Delegacion__c = '072-CALIENTAAGUAS'
    );

    insert acc;

    Contact con = new Contact(LastName = 'Juanito Galvan', AccountId = acc.Id);

    insert con;

    // Pricebook2 pb = new Pricebook2(Name = 'Test Price Book');
    // insert pb;

    Product2 prod = new Product2(
      Name = 'Aspirina test',
      //   Pricebook2Id = pb.Id,
      IsActive = true
    );

    Product2 prod2 = new Product2(
      Name = 'Jarabe de Palo',
      //   Pricebook2Id = pb.Id,
      IsActive = true
    );

    insert prod;
    insert prod2;
  }

  @isTest
  public static void orderTest() {
    // Account acc = [
    //   SELECT id, Name
    //   FROM Account
    //   WHERE Name = 'Calienta Aguas'
    //   LIMIT 1
    // ];
    // Contact con = [SELECT id FROM Contact WHERE AccountId = :acc.Id LIMIT 1];
    // Product2 product = [SELECT id FROM Product2 WHERE Name = 'Aspirina test'];
    // Product2 product2 = [SELECT id FROM Product2 WHERE Name = 'Jarabe de Palo'];

    List<Account> accs = [
      SELECT id, Name
      FROM Account
      WHERE Name = 'Calienta Aguas'
      LIMIT 1
    ];
    if (accs.isEmpty()) {
      System.assert(false, 'Account not found.');
    }
    Account acc = accs[0];

    List<Contact> cons = [
      SELECT id
      FROM Contact
      WHERE AccountId = :acc.Id
      LIMIT 1
    ];
    if (cons.isEmpty()) {
      System.assert(false, 'Contact not found.');
    }
    Contact con = cons[0];

    List<Product2> products = [
      SELECT id
      FROM Product2
      WHERE Name = 'Aspirina test'
    ];
    if (products.isEmpty()) {
      System.assert(false, 'Product not found.');
    }
    Product2 product = products[0];

    List<Product2> products2 = [
      SELECT id
      FROM Product2
      WHERE Name = 'Jarabe de Palo'
    ];
    if (products2.isEmpty()) {
      System.assert(false, 'Product2 not found.');
    }
    Product2 product2 = products2[0];

    String jsonSend =
      '{"Idcontacto":"' +
      con.Id +
      '" , "IdUmu": "' +
      acc.Id +
      '","TipoDePedido": "Ordinario","ordenesDetails": [ {"insumoId": "' +
      product.Id +
      '","CantidadSolicitada": 5},{"insumoId": "' +
      product2.Id +
      '","CantidadSolicitada": 5} ]}';

    // controladorGeneracionPedidos controla = new controladorGeneracionPedidos();

    Test.startTest();
    controladorGeneracionPedidos.DeserializarOrden(jsonSend);
    Test.stopTest();

    // Verify that the Order__c and Order_Line_Item__c records were created
    List<Order__c> orders = [
      SELECT Id, UMU__c, Tipo_de_Pedido__c, Total_de_Piezas__c
      FROM Order__c
    ];
    System.assertEquals(1, orders.size(), 'Expected size is different');

    List<Order_Line_Item__c> orderItems = [
      SELECT Id, Product__c, Cantidad_Solicitada__c, Order__c
      FROM Order_Line_Item__c
    ];
    System.assertEquals(
      1,
      orders.size(),
      'Expected one Order__c record to be created.'
    );
    System.assertEquals(
      2,
      orderItems.size(),
      'Expected one Order_Line_Item__c record to be created.'
    );
    System.assertEquals(
      orders[0].Id,
      orderItems[0].Order__c,
      'Order_Line_Item__c record does not reference the correct Order__c record.'
    );
    System.assertEquals(
      5,
      orderItems[0].Cantidad_Solicitada__c,
      'Order_Line_Item__c record does not have the expected Cantidad_Solicitada__c value.'
    );
  }
}