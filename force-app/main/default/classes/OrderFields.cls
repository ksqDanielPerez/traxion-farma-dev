public class OrderFields { 
    
    private static final String DEFAULT_ID_ORDINARIO = '000001';
    private static final String DEFAULT_ID_PROGRAMA = '00001-0001';
    private static final String DEFAULT_ID_NO_ORDINARIO_HR_CMN = '-01-00';
    private static final String DEFAULT_ID_NO_ORDINARIO = '-00-00';
    private static Integer contadorDeUmus = 1;

    public static void insertIdDePedido(List<Order__c> orderList){
        for (Order__c ord : orderList) {
            if(ord.Es_Programa__c != true){
                switch on ord.Tipo_de_Pedido__c {
                    when 'Ordinario' {
                        List<Order__c> lastOrderIdList = [
                            SELECT ID_de_Pedido__c, Tipo_de_Pedido__c 
                            FROM Order__c 
                            WHERE Tipo_de_Pedido__c = 'Ordinario'
                                AND ID_de_Pedido__c != null
                            ORDER BY Name DESC 
                            LIMIT 1
                        ]; 
                        if (!lastOrderIdList.isEmpty()) {
                            String lastOrderId = lastOrderIdList[0].ID_de_Pedido__c;
                            Integer newOrderId = Integer.valueOf(lastOrderId) + 1; 
                            ord.ID_de_Pedido__c = String.valueOf(newOrderId).leftPad(6, '0');
                        } else{
                            ord.ID_de_Pedido__c = DEFAULT_ID_ORDINARIO;
                        }
                    }
                    when 'Extraordinario', 'Urgencia Médica', 'Soporte de Vida', 'Emergencia Sanitaria'{
                        List<String> tiposDePedido = new List<String>{
                            'Extraordinario', 'Urgencia Médica', 'Soporte de Vida', 'Emergencia Sanitaria'
                        };
                        List<Order__c> lastOrderIdList = [
                            SELECT ID_de_Pedido__c, Tipo_de_Pedido__c, UMU__c, UMU__r.Tipo_UMU__c
                            FROM Order__c 
                            WHERE Tipo_de_Pedido__c IN: tiposDePedido
                                AND ID_de_Pedido__c != null
                                AND Es_Programa__c = false
                            ORDER BY Name DESC 
                            LIMIT 1
                        ];
                        Account umu = new Account();
                        List<Account> umuList = [SELECT Id, Name, Tipo_UMU__c FROM Account WHERE Id = :ord.UMU__c LIMIT 1];
                        if (umuList.size() != 1) {
                            break;
                        } else{
                            umu = umuList[0];
                        }
                        if (lastOrderIdList.size() != 1) { 
                            String orderIdSuffix = (umu.Tipo_UMU__c == 'HR' || umu.Tipo_UMU__c == 'CMN') ? DEFAULT_ID_NO_ORDINARIO_HR_CMN : DEFAULT_ID_NO_ORDINARIO;
                            ord.ID_de_Pedido__c = DEFAULT_ID_ORDINARIO + orderIdSuffix;          
                        } else{
                            String strId = lastOrderIdList[0].ID_de_Pedido__c; 
                            String firstSixCharsStrId = strId.substring(0, 6);
                            Integer numId = Integer.valueOf(firstSixCharsStrId) + 1; 
                            String orderIdSuffix = (umu.Tipo_UMU__c == 'HR' || umu.Tipo_UMU__c == 'CMN') ? DEFAULT_ID_NO_ORDINARIO_HR_CMN : DEFAULT_ID_NO_ORDINARIO;
                            String idString = String.valueOf(numId).leftPad(6, '0') + orderIdSuffix;
                            ord.ID_de_Pedido__c = idString;
                        }
                    } 
                }
            } else{
                switch on ord.Tipo_de_Pedido__c {
                    when 'Programa', 'Urgencia Médica', 'Soporte de Vida', 'Emergencia Sanitaria'{
                        List<String> tiposDePedido = new List<String>{
                            'Programa', 'Urgencia Médica', 'Soporte de Vida', 'Emergencia Sanitaria'
                        };

                        List<Order__c> lastOrderIdList = [
                            SELECT ID_de_Pedido__c, Tipo_de_Pedido__c
                            FROM Order__c 
                            WHERE Tipo_de_Pedido__c IN: tiposDePedido
                                AND ID_de_Pedido__c != null
                                AND Es_Programa__c = true
                            ORDER BY Name DESC 
                            LIMIT 1
                        ];

                        if(!lastOrderIdList.isEmpty()){ 
                            String strId = lastOrderIdList[0].ID_de_Pedido__c; 
                            String firstFiveCharsStrId = strId.substring(0, 5);
                            Integer numId = Integer.valueOf(firstFiveCharsStrId) + 1; 
                            String idSuffix = String.valueOf(contadorDeUmus).leftPad(4, '0');
                            String idString = String.valueOf(numId).leftPad(5, '0') + '-' + idSuffix;
                            contadorDeUmus ++;
                            ord.ID_de_Pedido__c = idString;
                        } else{
                            ord.ID_de_Pedido__c = DEFAULT_ID_PROGRAMA;
                        }
                    }
                }
            }
        }
    }

    public static void insertFechaMaximaDeEntrega(List<Order__c> orderList){ 

        Boolean esProgramaEmergenciaSanitaria = false;

        for(Order__c order : orderList){
            if(order.Es_Programa__c && (order.Tipo_de_Pedido__c == 'Programa' ||  order.Tipo_de_Pedido__c == 'Emergencia Sanitaria')){
                esProgramaEmergenciaSanitaria = true;
                break;
            }
        }

        if(!esProgramaEmergenciaSanitaria){
            List<Order__c> ordersToUpdate = new List<Order__c>(); 
        
            List<Order__c> orderListToQuery = [
                SELECT Id, UMU__c, Fecha_Limite_de_Entrega__c, Tipo_de_Pedido__c, CreatedDate
                   FROM Order__c
                WHERE Id IN: orderList
            ];  
            
            List<Id> umuIds = new List<Id>(); 
            for(Order__c ord : orderListToQuery){
                umuIds.add(ord.UMU__c);
            }
            
            Map<Id, Account> umuMap = new Map<Id, Account>([
                SELECT Id, Estado__c
                FROM Account
                WHERE Id IN: umuIds
            ]);
            
            for (Order__c order : orderListToQuery) {

                Account umu = umuMap.get(order.UMU__c);
                if (umu == null) {
                    continue; // skip orders with invalid UMU
                }

                Boolean isRestoDelPais = true;
                String estado = umu.Estado__c;
                if (estado != null) {
                    estado = estado.toLowerCase().replaceAll('[àáâäãåā]', 'a').replaceAll('[èéêëēėę]', 'e').replaceAll('[ìíîïī]', 'i').replaceAll('[òóôöõøō]', 'o').replaceAll('[ùúûüū]', 'u').replaceAll('[çč]', 'c').replaceAll('[ñ]', 'n').toUpperCase();
                    System.debug(estado);
                    if (estado == 'CIUDAD DE MEXICO' || estado == 'ESTADO DE MEXICO') {
                        isRestoDelPais = false;
                    }
                } 

                if(order.Tipo_de_Pedido__c == 'Urgencia Médica'){
                    // Get fecha max | CDMX + EdoMex = 12hr | Resto = 24 hrs
                    Datetime dateTimeLimiteDeEntrega = order.CreatedDate;
                    if(isRestoDelPais){
                        dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(24);
                    } else{
                        dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(12);
                    }
                    order.Fecha_Limite_de_Entrega__c = dateTimeLimiteDeEntrega;
                    ordersToUpdate.add(order);
                } 

                else if(order.Tipo_de_Pedido__c == 'Soporte de Vida'){
                    // Get fecha max | CDMX + EdoMex = 4hr | Resto = 8hrs
                    Datetime dateTimeLimiteDeEntrega = order.CreatedDate;
                    if(isRestoDelPais){
                        dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(8);
                    } else{
                        dateTimeLimiteDeEntrega = dateTimeLimiteDeEntrega.addHours(4);
                    }
                    order.Fecha_Limite_de_Entrega__c = dateTimeLimiteDeEntrega;
                    ordersToUpdate.add(order);
                }

                else if(order.Tipo_de_Pedido__c == 'Extraordinario'){
                    // Get fecha max de pedido ordinario relacionado 
                    List<Order__c> ordinaryOrder = [
                        SELECT Id, UMU__c, Tipo_de_Pedido__c, Fecha_Limite_de_Entrega__c, CreatedDate
                        FROM Order__c
                        WHERE Tipo_de_Pedido__c = 'Ordinario' 
                            AND Fecha_Limite_de_Entrega__c >=: order.CreatedDate
                            AND UMU__c =: order.UMU__c
                        ORDER BY Fecha_Limite_de_Entrega__c DESC
                        LIMIT 1
                    ]; 

                    if(!ordinaryOrder.isEmpty()){
                        order.Fecha_Limite_de_Entrega__c = ordinaryOrder[0].Fecha_Limite_de_Entrega__c;
                        ordersToUpdate.add(order);
                    }
                }

                else if(order.Tipo_de_Pedido__c == 'Ordinario'){
                    Datetime dateTimeLimiteDeEntrega = order.CreatedDate;
                    if(isRestoDelPais){              
                        dateTimeLimiteDeEntrega = calcularFechaHabil(order.CreatedDate, 5);
                        order.Fecha_Limite_de_Entrega__c = dateTimeLimiteDeEntrega;
                        ordersToUpdate.add(order);
                    } else{
                        dateTimeLimiteDeEntrega = calcularFechaHabil(order.CreatedDate, 3);
                        order.Fecha_Limite_de_Entrega__c = dateTimeLimiteDeEntrega;
                        ordersToUpdate.add(order);
                    }
                }
            } 
            if(!ordersToUpdate.isEmpty()){
                update ordersToUpdate;
            }
        }
    } 
    
    public static Datetime calcularFechaHabil(Datetime fechaDeCreacion, Integer diasHabiles){
        // Convert the date to a datetime with a default time of midnight
        // Datetime givenDateTime = Datetime.newInstance(fechaDeCreacion.year(), fechaDeCreacion.month(), fechaDeCreacion.day());
        
        // Calculate the date 3 business days in the future
        Integer businessDaysToAdd = diasHabiles;
        Datetime futureDate = fechaDeCreacion;
        while (businessDaysToAdd > 0) {
            // Add one day to the date
            futureDate = futureDate.addDays(1);
            
            // Convert the date to a datetime with a default time of midnight
            Datetime futureDateTime = Datetime.newInstance(futureDate.year(), futureDate.month(), futureDate.day());
            
            // Check if the day is a weekend (Saturday or Sunday)
            if (futureDateTime.format('E') != 'Sat' && futureDateTime.format('E') != 'Sun') {
                // Decrease the number of business days to add
                businessDaysToAdd--;
            }
        }
        
        // Return the resulting date
        return futureDate;
    }
}