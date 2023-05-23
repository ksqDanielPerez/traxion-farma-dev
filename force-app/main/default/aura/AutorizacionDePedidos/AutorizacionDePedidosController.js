({
    doInit : function(component, event, helper) {
        // Inicializar fechas default (3 meses atras y fecha de hoy)
        helper.inicializarFechas(component); 

        // Inicializar columnas de tabla
        helper.setupDataTable(component);

        // Obtener datos de tabla
        helper.getData(component);

        // Obtener datos de tabla
        helper.setNonApprovalReasons(component);
    },

    tabSelected : function(component, event, helper) {
        component.set('v.clavesSeleccionadas', []);
        component.set('v.umusSeleccionadas', []);
        component.set('v.delegacionesSeleccionadas', []);
        component.set('v.pedidosSeleccionados', []); 
        component.set('v.tipoDeClaveObj', {});
        component.set('v.tipoDeUMUObj', {});
        component.set('v.tipoDeDelegacionObj', {});
        component.set('v.tipoDePedidoObj', {});
        component.set('v.searchPhrase', '');

        // Inicializar columnas de tabla
        helper.setupDataTable(component);

        // Obtener datos de tabla
        helper.getData(component);

        //call event to clear picklist values 
        const appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
        appEvent.setParams({"clearValues" : true}); 
        appEvent.fire();
    },

    onNext: function(component, event, helper) {        
        let pageNumber = component.get("v.currentPageNumber");
        component.set("v.currentPageNumber", pageNumber + 1);
        helper.setPageDataAsPerPagination(component);
    },
        
    onPrev: function(component, event, helper) {        
        let pageNumber = component.get("v.currentPageNumber");
        component.set("v.currentPageNumber", pageNumber - 1);
        helper.setPageDataAsPerPagination(component);
    },
        
    onFirst: function(component, event, helper) {        
        component.set("v.currentPageNumber", 1);
        helper.setPageDataAsPerPagination(component);
    },
        
    onLast: function(component, event, helper) {        
        component.set("v.currentPageNumber", component.get("v.totalPages"));
        helper.setPageDataAsPerPagination(component);
    },
    
    onChangeSearchPhrase : function (component, event, helper) {
        let searchPhrase = component.get("v.searchPhrase");
        if ($A.util.isEmpty(searchPhrase)) {
            component.set('v.clavesSeleccionadas', []);
            component.set('v.umusSeleccionadas', []);
            component.set('v.delegacionesSeleccionadas', []);
            component.set('v.pedidosSeleccionados', []);
            component.set('v.tipoDeClaveObj', {});
            component.set('v.tipoDeUMUObj', {});
            component.set('v.tipoDeDelegacionObj', {});
            component.set('v.tipoDePedidoObj', {});

            const appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
            appEvent.setParams({"clearValues" : true}); 
            appEvent.fire();

            const allData = component.get("v.allData");
            component.set("v.filteredData", allData);
            helper.preparePagination(component, allData);
        }
    },

    onChangeClaveOrInsumoPhrase : function (component, event, helper) {
        console.log("onChangeClaveOrInsumoPhrase")
        let searchPhrase = component.get("v.searchClaveInsumoPhrase");
        console.log(searchPhrase);
        if ($A.util.isEmpty(searchPhrase)) {
            let sortedDataTable = component.get("v.sortedDataTable");
            component.set("v.oliData", sortedDataTable); 
        }
    },

    keyCheck : function (component, event, helper) {
        if (event.which == 13){ 
            component.set('v.clavesSeleccionadas', []);
            component.set('v.umusSeleccionadas', []);
            component.set('v.delegacionesSeleccionadas', []);
            component.set('v.pedidosSeleccionados', []);
            component.set('v.tipoDeClaveObj', {});
            component.set('v.tipoDeUMUObj', {});
            component.set('v.tipoDeDelegacionObj', {});
            component.set('v.tipoDePedidoObj', {});

            var appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
            appEvent.setParams({"clearValues" : true}); 
            appEvent.fire();

            helper.searchRecordsBySearchPhrase(component);
        } 
    },
    
    handleSearch : function (component, event, helper) {
        helper.searchRecordsBySearchPhrase(component);
    },

    handleFiltrarPorFechas : function(component, event, helper) { 
        helper.getData(component); 
    }, 

    handleClickedRow : function(component, event, helper) { 
        const row = event.getParam('row'); 
        const {Id = null} = row;
        if(!Id) return;
        const orderId = Id;
        component.set('v.clickedOrderId', orderId);
        helper.searchOLIBySelection(component, row); 
    },

    handleAplicarFiltros : function(component, event, helper) { 
        helper.searchRecordsByFilters(component);
    },

    handleAbrirCerrarFiltros : function(component, event, helper) { 
        helper.mostrarOcultarFiltros(component); 
    },   

    limpiarFiltros : function(component, event, helper) {
        component.set('v.clavesSeleccionadas', []);
        component.set('v.umusSeleccionadas', []);
        component.set('v.delegacionesSeleccionadas', []);
        component.set('v.pedidosSeleccionados', []); 
        component.set('v.tipoDeClaveObj', {});
        component.set('v.tipoDeUMUObj', {});
        component.set('v.tipoDeDelegacionObj', {});
        component.set('v.tipoDePedidoObj', {});
        component.set('v.searchPhrase', '');

        const allData = component.get("v.allData"); 
        component.set("v.filteredData", allData);

        //call event to clear picklist values 
        const appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
        appEvent.setParams({"clearValues" : true}); 
        appEvent.fire();

        helper.preparePagination(component, allData); 
    },

    handleAuthorizeOrder : function(component, event, helper) {
        console.log("Inside handleAuthorizeOrder");
        component.set("v.isLoading", true);
        helper.authorizeOrder(component);
    },

    obtenerClaves : function(component, event, helper) { 
        const params = event.getParam('arguments') || {};
        if(Object.keys(params).length > 0){
            const {picklistDeClavesSeleccionadas = null} = params;
            const claves = picklistDeClavesSeleccionadas && picklistDeClavesSeleccionadas != 'clearValues' ?
                picklistDeClavesSeleccionadas : [];
            component.set('v.clavesSeleccionadas', claves);

            const tipoDeClaveObj = {};
            if(claves.length > 0) {
                tipoDeClaveObj.show = true;
                tipoDeClaveObj.body = [{
                    type: 'avatar',
                    href: '',
                    label: claves.length > 1 ? `${claves.length} Opciones Seleccionadas  ` : 
                        `${claves.length} Opción Seleccionada  ` , 
                    fallbackIconName: 'standard:all',
                    variant: 'circle',
                    alternativeText: 'User avatar',
                }]
            } else{
                tipoDeClaveObj.show = false;
            }
            component.set('v.tipoDeClaveObj', tipoDeClaveObj);

            helper.searchRecordsByFilters(component);
        }
    },

    obtenerUMUs : function(component, event, helper) {  
        const params = event.getParam('arguments') || {};
        if(Object.keys(params).length > 0){
            const {picklistDeUMUsSeleccionadas = null} = params;
            const umus = picklistDeUMUsSeleccionadas && picklistDeUMUsSeleccionadas != 'clearValues' ? 
                picklistDeUMUsSeleccionadas : [];
            component.set('v.umusSeleccionadas', umus);

            const tipoDeUMUObj = {};
            if(umus.length > 0) {
                tipoDeUMUObj.show = true;
                tipoDeUMUObj.body = [{
                    type: 'avatar',
                    href: '',
                    label: umus.length > 1 ? `${umus.length} Opciones Seleccionadas  ` : 
                        `${umus.length} Opción Seleccionada  ` , 
                    fallbackIconName: 'standard:all',
                    variant: 'circle',
                    alternativeText: 'User avatar',
                }]
            } else{
                tipoDeUMUObj.show = false;
            }
            component.set('v.tipoDeUMUObj', tipoDeUMUObj);

            helper.searchRecordsByFilters(component);
        }
    },

    obtenerDelegaciones : function(component, event, helper) { 
        const params = event.getParam('arguments') || {};
        if(Object.keys(params).length > 0){
            const {picklistDeDelegacionesSeleccionadas = null} = params;
            const delegaciones = picklistDeDelegacionesSeleccionadas && picklistDeDelegacionesSeleccionadas != 'clearValues' ? 
                picklistDeDelegacionesSeleccionadas : [];
            component.set('v.delegacionesSeleccionadas', delegaciones);

            const tipoDeDelegacionObj = {};
            if(delegaciones.length > 0) {
                tipoDeDelegacionObj.show = true;
                tipoDeDelegacionObj.body = [{
                    type: 'avatar',
                    href: '',
                    label: delegaciones.length > 1 ? `${delegaciones.length} Opciones Seleccionadas  ` : 
                        `${delegaciones.length} Opción Seleccionada  ` , 
                    fallbackIconName: 'standard:all',
                    variant: 'circle',
                    alternativeText: 'User avatar',
                }]
            } else{
                tipoDeDelegacionObj.show = false;
            }
            component.set('v.tipoDeDelegacionObj', tipoDeDelegacionObj);

            helper.searchRecordsByFilters(component);
        }
    },

    obtenerPedidos : function(component, event, helper) {  
        const params = event.getParam('arguments') || {};
        if(Object.keys(params).length > 0){
            const {picklistDePedidosSeleccionados = null} = params;
            const pedidos = picklistDePedidosSeleccionados && picklistDePedidosSeleccionados != 'clearValues' ? 
                picklistDePedidosSeleccionados : [];
            component.set('v.pedidosSeleccionados', pedidos);

            const tipoDePedidoObj = {};
            if(pedidos.length > 0) {
                tipoDePedidoObj.show = true;
                tipoDePedidoObj.body = [{
                    type: 'avatar',
                    href: '',
                    label: pedidos.length > 1 ? `${pedidos.length} Opciones Seleccionadas  ` : 
                        `${pedidos.length} Opción Seleccionada  ` , 
                    fallbackIconName: 'standard:all',
                    variant: 'circle',
                    alternativeText: 'User avatar',
                }]
            } else{
                tipoDePedidoObj.show = false;
            }
            component.set('v.tipoDePedidoObj', tipoDePedidoObj);

            helper.searchRecordsByFilters(component);
        }
    },

    searchKeyChange : function(component, event, helper) {  
        if (event.which == 13){ 
            helper.searchOLIByClaveOrProduct(component);
        }
    },

    handleQuantityToApprove : function(component, event, helper) {
        const amountToModify = component.get('v.amountToModify');
        const oliToModify = component.get('v.oliToModify');
        const { Cantidad_Aprobada__c = 0 } = oliToModify;
        const selectedModificationReason = component.get('v.selectedModificationReason');
        const isEmptySelModReason = !selectedModificationReason ? true : false;
        const disableModifyContinue = !amountToModify || amountToModify > Cantidad_Aprobada__c || amountToModify == 0;
        component.set('v.disableModifyContinue', isEmptySelModReason || disableModifyContinue); 
        if (disableModifyContinue) component.set('v.amountToModify', null);
    },

    killModalDetallesOrden : function(component){
        const showModal = component.get("v.showModal");
        component.set("v.showModal", !showModal);

        const mainCmp = component.find('maincmp');
        showModal ? $A.util.removeClass(mainCmp, 'blur-main-cmp') : $A.util.addClass(mainCmp, 'blur-main-cmp');
    },

    killModalRechazoOLI : function(component, event, helper){
        component.set('v.selectedRejection', null);
        $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide'); 
        const detailCmp = component.find('detailcmp');
        $A.util.removeClass(detailCmp, 'blur-detail-cmp');
    },

    killModalModificaOLI : function(component, event, helper){ 
        component.set('v.amountToModify', null);
        component.set('v.selectedModificationReason', null);
        $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
        const detailCmp = component.find('detailcmp');
        $A.util.removeClass(detailCmp, 'blur-detail-cmp');
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

    handleDetermineAction : function(component, event, helper) {
        const selectedRow = event.getSource().get('v.value'); 
        const label = event.getSource().get('v.label'); 

        if(label === 'Autorizar'){
            component.set("v.isLoading", true);
            helper.handleAuthorize(component, selectedRow);
        } else if(label === 'Modificar'){
            helper.handleDisplayModifyModal(component, selectedRow);
        } else if(label === 'Rechazar'){
            helper.handleDisplayRejectModal(component, selectedRow);
        } else{
            console.log('Seleccion inválida: ' + label);
            component.set("v.isLoading", false);
        }
    },

    handleModifyPicklist : function(component, event, helper) {  
        const selectedModificationReason = event.getParam("value"); 
        component.set('v.selectedModificationReason', selectedModificationReason);
    },    

    handleModifyContinueClick : function(component, event, helper) {
        const selectedRow = event.getSource().get('v.value'); 
        helper.handleModify(component, selectedRow);

        $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
    },

    handleRejectPicklist : function (component, event) { 
        const selectedRejection = event.getParam("value"); 
        component.set('v.selectedRejection', selectedRejection);
        component.set('v.disableRejectContinue', !selectedRejection);
    },

    handleRejectContinueClick : function(component, event, helper) { 
        const selectedRow = event.getSource().get('v.value'); 
        helper.handleReject(component, selectedRow); 

        $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
    }

})