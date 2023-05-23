({
    doInit : function(component, event, helper) {  
        // Inicializar fechas default (3 meses atras y fecha de hoy)
        helper.inicializarFechas(component); 

        // Popular lista de motivos de no aprobación	
        helper.setNonApprovalReasons(component); 

        const tabSelectorStatus = {
            'pendiente' : true,
            'aprobado' : false,
            'rechazado' : false
        }
        component.set('v.tabSelectorStatus', tabSelectorStatus);

        // Cargar tabla relacionada a tabset elegido
        const initializeValues = true;
        const filtrarPorFecha = false;
        const selectedTab = component.get('v.selTabId');
        helper.getDatosDeTabla(component, initializeValues, filtrarPorFecha, selectedTab);

        // Crear las columnas de la tabla
        helper.getColumns(component);

        // Obtener datos de filtros
        helper.getTransportesToFilter(component);  
    },

    tabSelected : function(component, event, helper) {
        // Cargar tabla relacionada a tabset elegido
        const initializeValues = true;
        const filtrarPorFecha = false;
        const selectedTab = component.get("v.selTabId");

        const tabSelectorStatus = {
            'pendiente' : selectedTab === 'Pendiente',
            'aprobado' : selectedTab === 'Aprobado',
            'rechazado' : selectedTab === 'Rechazado'
        }
        component.set('v.tabSelectorStatus', tabSelectorStatus);

        helper.getDatosDeTabla(component, initializeValues, filtrarPorFecha, selectedTab);
    },

    searchKeyChange : function(component, event, helper) { 
        const searchKey = component.find("searchKey").get("v.value");  
        const selectedOrderInfo = component.get('v.selectedRowInformation');    
        const {Id = null} = selectedOrderInfo;
        if(!Id) return;
        const action = component.get("c.getFilteredItems");
        action.setParams({
            "orderId": Id,
            "searchKey" : searchKey
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();
                helper.mostrarDetalles(component, responseVal, false);
            } else{
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);
    },

    handleAplicarFiltros : function(component, event, helper) { 
        const initializeValues = false;
        const filtrarPorFecha = false;
        const selectedTab = component.get("v.selTabId");
        helper.getDatosDeTabla(component, initializeValues, filtrarPorFecha, selectedTab);
    },

    handleFiltrarPorFechas : function(component, event, helper) {  
        const initializeValues = false;
        const filtrarPorFecha = true;
        const selectedTab = component.get("v.selTabId");
        helper.getDatosDeTabla(component, initializeValues, filtrarPorFecha, selectedTab);
    }, 

    handleClickedRow : function(component, event, helper) { 

        // const selectedTab = component.get("v.selTabId");

        const selectedTab = 'Rechazado';

        const row = event.getParam('row'); 
        const {Id = null} = row;
        if(!Id) return;
        const action = component.get("c.getOrderByOLIId");
        action.setParams({
            "orderId": Id,
            'estatusNoOrdinario': selectedTab
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();
                helper.mostrarDetalles(component, responseVal, false);
                helper.showModal(component);
            } else{
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);
    }, 

    killModalDetallesOrden : function(component){
        $A.util.toggleClass(component.find("detallesOrden"), 'slds-hide');
        component.set('v.selectedRowInformation', {});
        component.set('v.selectedRowItemsToApprove', []);
    },

    killModalRechazoOLI : function(component, event, helper){
        component.set('v.selectedRejection', null);
        $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
    },

    killModalModificaOLI : function(component, event, helper){ 
        $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
    },

    handleAbrirCerrarFiltros : function(component, event, helper) { 
        helper.mostrarOcultarFiltros(component); 
    },   

    limpiarFiltros : function(component, event, helper) {
        component.set('v.clavesSeleccionadas', []);
        component.set('v.umusSeleccionadas', []);
        component.set('v.estadosSeleccionados', []);
        component.set('v.pedidosSeleccionados', []);
        component.set('v.transportesSeleccionados', []);

        //call event to clear picklist values 
        var appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
        appEvent.setParams({"clearValues" : true}); 
        appEvent.fire();

        helper.mostrarOcultarFiltros(component); 
    },

    obtenerClaves : function(component, event) { 
        var params = event.getParam('arguments');
        if(params){
            var clavesSeleccionadas = params.picklistDeClavesSeleccionadas; 
            clavesSeleccionadas != 'clearValues' ? component.set('v.clavesSeleccionadas', JSON.parse(JSON.stringify(clavesSeleccionadas))) : component.set('v.clavesSeleccionadas', []);
        }
    },

    obtenerUMUs : function(component, event) {  
        var params = event.getParam('arguments');
        if(params){
            var umusSeleccionadas = params.picklistDeUMUsSeleccionadas; 
            umusSeleccionadas != 'clearValues' ? component.set('v.umusSeleccionadas', JSON.parse(JSON.stringify(umusSeleccionadas))) : component.set('v.umusSeleccionadas', []);
        }
    },

    obtenerEstados : function(component, event) {  
        var params = event.getParam('arguments');
        if(params){
            var estadosSeleccionados = params.picklistDeEstadosSeleccionados; 
            estadosSeleccionados != 'clearValues' ? component.set('v.estadosSeleccionados', JSON.parse(JSON.stringify(estadosSeleccionados))) : component.set('v.estadosSeleccionados', []);
        }
    },

    obtenerPedidos : function(component, event) {  
        var params = event.getParam('arguments');
        if(params){
            var pedidosSeleccionados = params.picklistDePedidosSeleccionados; 
            pedidosSeleccionados != 'clearValues' ? component.set('v.pedidosSeleccionados', JSON.parse(JSON.stringify(pedidosSeleccionados))) : component.set('v.pedidosSeleccionados', []);
        }
    },

    obtenerTransportes : function(component, event) {  
        var params = event.getParam('arguments');
        if(params){
            var transportesSeleccionados = params.picklistDeTransportesSeleccionados; 
            transportesSeleccionados != 'clearValues' ? component.set('v.transportesSeleccionados', JSON.parse(JSON.stringify(transportesSeleccionados))) : component.set('v.transportesSeleccionados', []);
        }
    },

    handleEdit : function(component, event, helper) {  
        const message = ''; 
        const pendingQty = 0;
        const actionType = 'Pendiente';
        const pendingRow = event.getSource().get('v.value');   
        const {Id} = pendingRow;
        if(!Id) return; 
        helper.updateOLI(component, Id, actionType, pendingQty, message);
    },

    handleAprrove : function(component, event, helper) { 
        const message = ''; 
        const actionType = 'Aprobado'; 
        const approvedRow = event.getSource().get('v.value'); 
        const {Order__c, Id} = approvedRow;
        if(!approvedRow) return; 
        let approvedQty = 0;
        const data = component.get('v.data') || [];  
        const approvedOrder = data.find(order => order.Id === Order__c);
        if (approvedOrder) {
            const { Order_Line_Items__r } = approvedOrder; 
            const approvedLineItem = Order_Line_Items__r.find(oli => oli.Id === approvedRow.Id);
            if (approvedLineItem) {
                approvedQty = approvedLineItem.Cantidad_Solicitada__c;
            }
        } 
        if(!Id) return;
        helper.updateOLI(component, Id, actionType, approvedQty, message);

        // const totalInsumosAgregados = component.get('v.totalInsumosAgregados');
        // const newTotalInsumosAgregados = totalInsumosAgregados + approvedQty;
        // component.set('v.totalInsumosAgregados', newTotalInsumosAgregados);
        // component.set('v.activeSections', ['C', 'D']);
    },

    handleModify : function(component, event, helper) {  
        console.log("INSIDE OLI TO MODIFY");
        const oliToModify = event.getSource().get('v.value');  
        console.log(oliToModify);  
        component.set('v.oliToModify', oliToModify);

        $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
        $('#modificaOrderLineItem').keyup(function(event){
            if (event.keyCode == 27){
                // Close the modal/menu
                $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
            }
        }); 
    },

    handleModifyPicklist : function(component, event, helper) {  
        const selectedModificationReason = event.getParam("value"); 
        component.set('v.selectedModificationReason', selectedModificationReason);
    },

    handleModifyContinueClick : function(component, event, helper) {

        console.log("Inside continue click");

        const message = component.get('v.selectedModificationReason') || ''; 

        console.log(message);

        const amountToModify = component.get('v.amountToModify');

        console.log(amountToModify);


        const actionType = 'Modificado';
        const modifedRow = event.getSource().get('v.value'); 

        console.log(modifedRow);

        const {Id} = modifedRow;

        console.log(Id);

        // if(!Id) return; 

        console.log("flag");

        // helper.updateOLI(component, Id, actionType, amountToModify, message);


        const action = component.get("c.updateOrderLineItem");
        action.setParams({
            "orderLineId": Id, 
            "actionType" : actionType,
            "quantity" : amountToModify,
            "message" : message
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            console.log(state);
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();

                console.log(responseVal);

                helper.mostrarDetalles(component, responseVal, false);
            } else{
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);





        $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
    },

    handleReject : function(component, event, helper) {  
        const oliToReject = event.getSource().get('v.value');  
        component.set('v.oliToReject', oliToReject);

        $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
        $('#rechazoOrderLineItem').keyup(function(event){
            if (event.keyCode == 27){
                // Close the modal/menu
                $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
            }
        }); 
    },

    handleRejectPicklist : function (component, event) { 
        const selectedRejection = event.getParam("value"); 
        component.set('v.selectedRejection', selectedRejection);
    },

    handleRejectContinueClick : function(component, event, helper) { 
        const message = component.get('v.selectedRejection') || ''; 
        const rejectedQty = 0;
        const actionType = 'Rechazado';
        const rejectedRow = event.getSource().get('v.value');   
        const {Id} = rejectedRow;
        if(!Id) return; 
        helper.updateOLI(component, Id, actionType, rejectedQty, message);

        $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
    },

    handleUpdateOrder : function(component, event, helper) {
        
        console.log("Inside handle update order");

        const selectedTab = component.get("v.selTabId");
        const orderToUpdate = event.getSource().get('v.value');
        console.log(JSON.parse(JSON.stringify(orderToUpdate)));

        const {Id} = orderToUpdate;
        if(!Id) return;
        
        const action = component.get("c.updateOrderAndOLIs");
        action.setParams({
            "orderId": Id,
            'estatusNoOrdinario': selectedTab
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            console.log(state);
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();
                console.log(JSON.parse(JSON.stringify(responseVal)));


                // Cargar tabla relacionada a tabset elegido
                const initializeValues = true;
                const filtrarPorFecha = false;
                const selectedTab = component.get("v.selTabId");
                helper.getDatosDeTabla(component, initializeValues, filtrarPorFecha, selectedTab);

                $A.util.toggleClass(component.find("detallesOrden"), 'slds-hide');
                component.set('v.selectedRowInformation', {});
                component.set('v.selectedRowItemsToApprove', []);

            } else{
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);
    }
})