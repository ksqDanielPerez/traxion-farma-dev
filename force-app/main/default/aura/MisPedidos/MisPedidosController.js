({
    doInit : function(component, event, helper) {
        // Inicializar fechas default (3 meses atras y fecha de hoy)
        helper.inicializarFechas(component); 

        // Inicializar columnas de tabla
        helper.setupDataTable(component);

        // Obtener datos de tabla
        helper.getData(component);

        component.set('v.showHideFiltros', {
            mostrarmas : true,
            mostrarmenos : false
        })
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
 
    onPageSizeChange: function(component, event, helper) {        
        helper.preparePagination(component, component.get('v.filteredData'));
    },
 
    onChangeSearchPhrase : function (component, event, helper) {
        let searchPhrase = component.get("v.searchPhrase");
        let deliveryNumber = component.get("v.deliveryNumber");

        if ($A.util.isEmpty(searchPhrase) || $A.util.isEmpty(deliveryNumber)) {
            component.set('v.clavesSeleccionadas', []);
            component.set('v.umusSeleccionadas', []);
            component.set('v.estadosSeleccionados', []);
            component.set('v.pedidosSeleccionados', []);
            component.set('v.transportesSeleccionados', []);

            var appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
            appEvent.setParams({"clearValues" : true}); 
            appEvent.fire();

            let allData = component.get("v.allData");
            component.set("v.filteredData", allData);
            helper.preparePagination(component, allData);
        }
    },

    keyCheck : function (component, event, helper) {
        if (event.which == 13){ 

            console.log("Inside key check");

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

    handleFiltrarPorFechas : function(component, event, helper) { 
        helper.getData(component); 
    }, 

    handleClickedRow : function(component, event, helper) { 
        const row = event.getParam('row'); 
        const selectedRow = true;
        helper.mostrarDetalles(component, row, selectedRow); 
    },

    handleShowHideFiltros : function(component, event, helper) {
        console.log("Inside handle show hide filtros");

        const showHideFiltros = component.get('v.showHideFiltros');
        console.log(JSON.parse(JSON.stringify(showHideFiltros))); 

        component.set('v.showHideFiltros', {
            mostrarmas : !showHideFiltros.mostrarmas,
            mostrarmenos : !showHideFiltros.mostrarmenos
        });

        // showHideFiltros.mostrarmas = !showHideFiltros.mostrarmas;
        // showHideFiltros.mostrarmenos = !showHideFiltros.mostrarmenos;

        // console.log(JSON.parse(JSON.stringify(showHideFiltros))); 
        // component.set('showHideFiltros', showHideFiltros);

        // const showHideFiltros = component.get('v.showHideFiltros');
        // component.set('v.showHideFiltros', !showHideFiltros);
    },

    // handleAplicarFiltros : function(component, event, helper) { 
    //     helper.searchRecordsByFilters(component);
    // },

    // handleAbrirCerrarFiltros : function(component, event, helper) { 
    //     helper.mostrarOcultarFiltros(component); 
    // },   

    limpiarFiltros : function(component, event, helper) {
        component.set('v.clavesSeleccionadas', []);
        component.set('v.umusSeleccionadas', []);
        component.set('v.estadosSeleccionados', []);
        component.set('v.pedidosSeleccionados', []);
        component.set('v.transportesSeleccionados', []);

        component.set('v.tipoDeClaveObj', {});
        component.set('v.tipoDeUMUObj', {});
        component.set('v.tipoDeEstadoObj', {});
        component.set('v.tipoDePedidoObj', {});
        component.set('v.searchPhrase', '');
        component.set('v.deliveryNumber', '');
        component.set('v.remisionNumber', '');

        const allData = component.get("v.allData");
        component.set("v.filteredData", allData);
        helper.preparePagination(component, allData);
        helper.mostrarDetalles(component, allData, false);
        // helper.mostrarOcultarFiltros(component);

        //call event to clear picklist values 
        var appEvent = $A.get("e.c:limpiarParametrosDeFiltros"); 
        appEvent.setParams({"clearValues" : true}); 
        appEvent.fire();
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

        // var params = event.getParam('arguments');
        // if(params){
        //     var clavesSeleccionadas = params.picklistDeClavesSeleccionadas; 
        //     clavesSeleccionadas != 'clearValues' ? component.set('v.clavesSeleccionadas', JSON.parse(JSON.stringify(clavesSeleccionadas))) : component.set('v.clavesSeleccionadas', []);
        // }
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

        // var params = event.getParam('arguments');
        // if(params){
        //     var umusSeleccionadas = params.picklistDeUMUsSeleccionadas; 
        //     umusSeleccionadas != 'clearValues' ? component.set('v.umusSeleccionadas', JSON.parse(JSON.stringify(umusSeleccionadas))) : component.set('v.umusSeleccionadas', []);
        // }
    },

    obtenerEstados : function(component, event, helper) {
        const params = event.getParam('arguments') || {};
        if(Object.keys(params).length > 0){
            const {picklistDeEstadosSeleccionados = null} = params;
            const estados = picklistDeEstadosSeleccionados && picklistDeEstadosSeleccionados != 'clearValues' ? 
                picklistDeEstadosSeleccionados : [];

            console.log("Inside if");
            console.log(JSON.parse(JSON.stringify(estados)));

            component.set('v.estadosSeleccionados', estados);

            const tipoDeEstadoObj = {};
            if(estados.length > 0) {
                tipoDeEstadoObj.show = true;
                tipoDeEstadoObj.body = [{
                    type: 'avatar',
                    href: '',
                    label: estados.length > 1 ? `${estados.length} Opciones Seleccionadas  ` : 
                        `${estados.length} Opción Seleccionada  ` , 
                    fallbackIconName: 'standard:all',
                    variant: 'circle',
                    alternativeText: 'User avatar',
                }]
            } else{
                tipoDeEstadoObj.show = false;
            }
            component.set('v.tipoDeEstadoObj', tipoDeEstadoObj);
            helper.searchRecordsByFilters(component);
        }

        // var params = event.getParam('arguments');
        // if(params){
        //     var estadosSeleccionados = params.picklistDeEstadosSeleccionados; 
        //     estadosSeleccionados != 'clearValues' ? component.set('v.estadosSeleccionados', JSON.parse(JSON.stringify(estadosSeleccionados))) : component.set('v.estadosSeleccionados', []);
        // }
    },

    obtenerPedidos : function(component, event, helper){ 
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


        // var params = event.getParam('arguments');
        // if(params){
        //     var pedidosSeleccionados = params.picklistDePedidosSeleccionados; 
        //     pedidosSeleccionados != 'clearValues' ? component.set('v.pedidosSeleccionados', JSON.parse(JSON.stringify(pedidosSeleccionados))) : component.set('v.pedidosSeleccionados', []);
        // }
    },

    obtenerTransportes : function(component, event) {  
        var params = event.getParam('arguments');
        if(params){
            var transportesSeleccionados = params.picklistDeTransportesSeleccionados; 
            transportesSeleccionados != 'clearValues' ? component.set('v.transportesSeleccionados', JSON.parse(JSON.stringify(transportesSeleccionados))) : component.set('v.transportesSeleccionados', []);
        }
    }
})