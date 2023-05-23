({   
    inicializarFechas : function(component) {
        const fechaActual = new Date();
        const anioActual = fechaActual.getFullYear();
        const mesActual = fechaActual.getMonth() + 1;
        const diaActual = fechaActual.getDate(); 
        component.set('v.fechaFin', `${anioActual}-${mesActual}-${diaActual}`);

        let fechaHaceTresMeses = new Date(fechaActual);
        fechaHaceTresMeses.setMonth(fechaHaceTresMeses.getMonth() - 3);
        const anioPasado = fechaHaceTresMeses.getFullYear();
        const mesPasado = fechaHaceTresMeses.getMonth() + 1;
        const diaPasado = fechaHaceTresMeses.getDate(); 
        component.set('v.fechaInicio', `${anioPasado}-${mesPasado}-${diaPasado}`);

        const filterObj = component.get('v.filterObj') || {};
        filterObj.fechaInicio = `${anioPasado}-${mesPasado}-${diaPasado}`;
        filterObj.fechaFin = `${anioActual}-${mesActual}-${diaActual}`;
        component.set('v.filterObj', filterObj); 
    }, 

    setNonApprovalReasons : function(component) {
        component.set('v.nonApprovalReasons', [
            {'label': 'N/A', 'value': 'N/A'},
            {'label': 'Inexistencia en CENDADI', 'value': 'Inexistencia en CENDADI'},
            {'label': 'Suficientes existencias en UMU', 'value': 'Suficientes existencias en UMU'}
        ]);
    },

    getDatosDeTabla : function(component, initializeValues, filtrarPorFecha, estatusNoOrdinario) {
        
        console.log("inside get datos de tabla");
        const datosTabla = this.getDatosTablaParameters(component, estatusNoOrdinario);
        console.log(JSON.parse(JSON.stringify(datosTabla)));

        const action = component.get("c.getFilteredOrders");
        action.setParams({ 
            jsonString : JSON.stringify(datosTabla)
        }); 
        action.setCallback(this, function(response) {
            const state = response.getState();
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue(); 
                this.mostrarDetalles(component, responseVal, true);

                console.log("Continue");

                if(initializeValues){
                    this.getOrderLineItem(component, responseVal); 
                } else{  
                    if(!filtrarPorFecha){
                        this.mostrarOcultarFiltros(component); 
                    } 
                    this.showToast(component, '¡Filtrado Existoso!', 'success', 'Los datos se han actualizdo en la tabla'); 
                }  
            } else{
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);
    },

    getDatosTablaParameters : function(component, estatusNoOrdinario) {
        const filtros = {
            clavesSeleccionadas : component.get('v.clavesSeleccionadas'),
            umusSeleccionadas : component.get('v.umusSeleccionadas'),
            estadosSeleccionados : component.get('v.estadosSeleccionados'),
            pedidosSeleccionados : component.get('v.pedidosSeleccionados'),
            transportesSeleccionados : component.get('v.transportesSeleccionados')
        }
        const clavesSeleccionadas = filtros.clavesSeleccionadas.map(clave => clave.Id);
        const estadosSeleccionados = filtros.estadosSeleccionados.map(estado => estado.Id);
        const pedidosSeleccionados = filtros.pedidosSeleccionados.map(pedido => pedido.Id);
        const transportesSeleccionados = filtros.transportesSeleccionados.map(transporte => transporte.Id);
        const umusSeleccionadas = filtros.umusSeleccionadas.map(umus => umus.Id);  
        const fechaInicio = component.get('v.fechaInicio'); 
        const fechaFin = component.get('v.fechaFin'); 
        const formattedFechaInicio = new Date(fechaInicio).toISOString().split('T')[0];
        const formattedFechaFin = new Date(fechaFin).toISOString().split('T')[0];

        return {
            estatusNoOrdinario,
            clavesSeleccionadas,
            umusSeleccionadas,
            estadosSeleccionados,
            pedidosSeleccionados,
            transportesSeleccionados,
            fechaInicio : formattedFechaInicio,
            fechaFin : formattedFechaFin
        }
    },

    

    mostrarDetalles : function(component, data, isInit) {

        // console.log("MOSTRAR DETALLES");
        // console.log(data);
        // console.log(isInit);

        if(!data) return;   
        const dataWithEstadoTemporal = this.getEstadoTemporalOrderLineItem(component, data);

        if (isInit) {
            component.set('v.data', dataWithEstadoTemporal);
            this.getDPNDates(component, dataWithEstadoTemporal);
        } else {
            const selectedRowInformation = Array.isArray(dataWithEstadoTemporal)
                ? dataWithEstadoTemporal[0]
                : dataWithEstadoTemporal;
            const orderLineItems = selectedRowInformation.Order_Line_Items__r;
            if (!orderLineItems) {
                return;
            }
            component.set('v.selectedRowInformation', selectedRowInformation);
            component.set('v.selectedRowItemsToApprove', orderLineItems);
            this.getDPNDates(component, selectedRowInformation);
            // this.getDPNInformation(component, orderLineItems);
            this.getDocumentosRelacionados(component, selectedRowInformation);
        }

        // this.getDPNDates(component, data);
        // this.getDPNInformation(component, data);
        // this.getDocumentosRelacionados(component, data);
    },

    getEstadoTemporalOrderLineItem : function(component, data) {

        console.log('INSIDE GET ESTADO TEMPORAL');
        console.log(JSON.parse(JSON.stringify(data)));

        let oliSize = 0;
        let oliWithStatus = 0;
        const tabSelectorStatus = component.get('v.tabSelectorStatus');

        for(let i=0; i < data.length; i++) {
            const order = data[i];
            const {Order_Line_Items__r, UMU__r = {}} = order; 
            const {Name = ''} = UMU__r; 
            order.UMUName = Name;
            if(!Order_Line_Items__r) continue;

            oliSize = Order_Line_Items__r.length;


            for(let j=0; j<Order_Line_Items__r.length; j++) {
                const status = Order_Line_Items__r[j];
                const {Estatus_Aprobaci_n__c} = status; 
                switch (Estatus_Aprobaci_n__c) {
                    case 'Pendiente': 
                        oliWithStatus -= 1;
                        delete status.EstadoTemporal;  
                        continue;
                    case 'Aprobado':
                        oliWithStatus += 1;
                        status.EstadoTemporal = {
                            label : 'Aprobado',
                            class : 'slds-theme_success slds-align_absolute-center',
                            icon : 'utility:success',
                            value : tabSelectorStatus.aprobado
                        }
                        continue;
                    case 'Modificado':
                        oliWithStatus += 1;
                        status.EstadoTemporal = {
                            label : 'Modificado',
                            class : 'slds-badge_inverse slds-align_absolute-center',
                            icon : 'utility:change_record_type',
                            value : true
                        }  
                        continue;
                    case 'Rechazado':
                        oliWithStatus += 1;
                        status.EstadoTemporal = {
                            label : 'Rechazado',
                            class : 'slds-theme_error slds-align_absolute-center',
                            icon : 'utility:error',
                            value : tabSelectorStatus.rechazado
                        }
                        continue;
                    default:
                        console.log(`Other`);
                        continue;
                } 
            }
        }

        // if(data.length === 1 && oliWithStatus === oliSize){
        //     console.log('YAAAY');

        //     const orderToUpdate = data[0];
        //     console.log(JSON.parse(JSON.stringify(orderToUpdate)));

        //     const {Id} = orderToUpdate;
        //     if(!Id) return;
            
        //     const action = component.get("c.updateOrderAndOLIs");
        //     action.setParams({
        //         "orderId": Id
        //     });
        //     action.setCallback(this, function(response) { 
        //         const state = response.getState();
        //         console.log(state);
        //         if (state === "SUCCESS") {
        //             const responseVal = response.getReturnValue();
        //             console.log(JSON.parse(JSON.stringify(responseVal)));


        //             // Cargar tabla relacionada a tabset elegido
        //             const initializeValues = true;
        //             const filtrarPorFecha = false;
        //             const selectedTab = component.get("v.selTabId");
        //             this.loadTableRelatedToSelTab(component, initializeValues, filtrarPorFecha, selectedTab); 

        //             $A.util.toggleClass(component.find("detallesOrden"), 'slds-hide');
        //             component.set('v.selectedRowInformation', {});
        //             component.set('v.selectedRowItemsToApprove', []);

        //         } else{
        //             console.log(response.getError());
        //         }
        //     });
        //     $A.enqueueAction(action);
        // }

        return data;
    },

    getDPNDates : function(component, data) {
        const {UMU__c = null} = data;
        if(!UMU__c) return; 

        const action = component.get("c.getDPNDates");
        action.setParams({
            "umuId" : UMU__c 
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            console.log(state);
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();
                console.log(JSON.parse(JSON.stringify(responseVal))); 
                const today = new Date();
                const {ultimaFecha = today, proximaFecha = today} = responseVal; 
                const fechasDeValidacion = {
                    proximaFecha,
                    ultimaFecha
                } 
                component.set("v.fechasDeValidacion", fechasDeValidacion); 
            } else{
                console.log(response.getErrorMessage());
            }
        });
        $A.enqueueAction(action);
    },

    // getDPNInformation(component, data) {
    // },

    getDocumentosRelacionados : function(component, data) {
        $A.createComponent(
            "c:filesContainer",
            {orderId : data.Id},
            function(newCmp) {
                if (component.isValid()) { 
                    component.set("v.body", newCmp);
                }
            }
        );
    },

    showModal : function(component) {
        $A.util.toggleClass(component.find("detallesOrden"), 'slds-hide');
        $('#detallesOrden').keyup(function(event){
            if (event.keyCode == 27){
                // Close the modal/menu
                $A.util.toggleClass(component.find("detallesOrden"), 'slds-hide');
            }
        });
    },

    showToast : function(component, title, type, message) {
        const toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
            "title": title,
            "type" : type,
            "message": message
        });
        toastEvent.fire();
    },

    updateOLI : function(component, oliId, actionType, quantity, message) {

        console.log("Inside update oli")
        console.log(oliId)
        console.log(actionType)
        console.log(quantity)
        console.log(message)

        const action = component.get("c.updateOrderLineItem");
        action.setParams({
            "orderLineId": oliId, 
            "actionType" : actionType,
            "quantity" : quantity,
            "message" : message
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            console.log(state);
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();

                console.log(responseVal);

                this.mostrarDetalles(component, responseVal, false);
            } else{
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);
    },







    getOrderLineItem : function(component, data) {
        // Get list of order ids 
        const orderIdList = [];
        data.forEach(element => orderIdList.push(element.Id)); 
        const action = component.get("c.getOrderLineItems");
        action.setParams({ orderIdList : orderIdList });
        action.setCallback(this, function(response) {
            const state = response.getState();  
            console.log(state);
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue(); 
                // TODO: Simplify all this
                console.log("Chido 1")
                this.getClavesToFilter(component, responseVal);
                this.getUMUSToFilter(component, responseVal);
                this.getEstadosToFilter(component, responseVal);
                this.getPedidosToFilter(component, responseVal);
                console.log("Chido 2")
            }
        });
        $A.enqueueAction(action);
    },

    mostrarOcultarFiltros : function(component) {
        const x = document.getElementById("divFiltros");
        if (x.style.display === "none") {
            x.style.display = "block";
        } else {
            x.style.display = "none";
        } 

        const y = document.getElementById("divBtnMuestraFiltros");
        if (y.style.display === "none") {
            y.style.display = "block";
        } else {
            y.style.display = "none";
        } 
    },  

    getClavesToFilter : function(component, data) { 
        const msClaves = [];  
        data.forEach(function(item) {
            const product = item.Product__r;
            if (product.Name && product.Product_Code_ID__c) { 
                const {Name, Product_Code_ID__c} = product; 
                // generate a new object 
                const newObject = {
                    'Id': Product_Code_ID__c,
                    'Name': `${Product_Code_ID__c} - ${Name}`
                }; 
                // Check if the obj already exists
                const existingObjectIndex = msClaves.findIndex(obj => obj.Id === newObject.Id);
                if (existingObjectIndex === -1) { 
                    msClaves.push(newObject);
                }  
            }
        });   

        // console.log("PRINTING FILTER OBJ: " )
        const filterObj = component.get('v.filterObj') || {};
        // console.log(JSON.parse(JSON.stringify(filterObj)));
        filterObj.msClaves = msClaves;
        component.set('v.filterObj', filterObj); 
        // component.set('v.msClaves', msClaves); 
    },

    getUMUSToFilter : function(component, data) { 
        const msUMUs = [];  
        data.forEach(function(item) {
            const {Account__r = {}} = item;
            const {Name = null, Clave_Presupuestal__c = null} = Account__r;
            if (Name && Clave_Presupuestal__c) { 
                // generate a new object 
                const newObject = {
                    'Id': Clave_Presupuestal__c,
                    'Name': `${Clave_Presupuestal__c} - ${Name}`
                }; 
                // Check if the obj already exists
                const existingObjectIndex = msUMUs.findIndex(obj => obj.Id === newObject.Id);
                if (existingObjectIndex === -1) { 
                    msUMUs.push(newObject);
                }  
            }
        });   

        const filterObj = component.get('v.filterObj') || {};
        filterObj.msUMUs = msUMUs;
        component.set('v.filterObj', filterObj); 

        // component.set('v.msUMUs', msUMUs); 
    },

    getEstadosToFilter : function(component, data) {
        const msEstados = [];  
        data.forEach(function(item) {
            const account = item.Account__r;
            if (account.Estado__c) { 
                const {Estado__c} = account; 
                // generate a new object 
                const newObject = {
                    'Id': Estado__c,
                    'Name': Estado__c
                }; 
                // Check if the obj already exists
                const existingObjectIndex = msEstados.findIndex(obj => obj.Id === newObject.Id);
                if (existingObjectIndex === -1) { 
                    msEstados.push(newObject);
                }  
            }
        });   

        const filterObj = component.get('v.filterObj') || {}; 
        filterObj.msEstados = msEstados;
        component.set('v.filterObj', msEstados); 

        // component.set('v.msEstados', msEstados); 
    },

    getPedidosToFilter : function(component, data) {
        const msPedidos = [];  
        data.forEach(function(item) {
            const tipoDePedido = item.Tipo_de_Pedido__c;
            if (tipoDePedido) {  
                // generate a new object 
                const newObject = {
                    'Id': tipoDePedido,
                    'Name': tipoDePedido
                }; 
                // Check if the obj already exists
                const existingObjectIndex = msPedidos.findIndex(obj => obj.Id === newObject.Id);
                if (existingObjectIndex === -1) { 
                    msPedidos.push(newObject);
                }  
            }
        });   

        const filterObj = component.get('v.filterObj') || {};
        filterObj.msPedidos = msPedidos;
        component.set('v.filterObj', msPedidos); 

        // component.set('v.msPedidos', msPedidos); 
    },

    getTransportesToFilter : function(component) {
        const msTransportes = [];
        const arrayDeTransportes = ['0600660666', '0604830158', '0608410882'];
        for(var i=0; i < arrayDeTransportes.length; i++){
            msTransportes.push({
                'Id' : i,
                'Name': arrayDeTransportes[i]
            })
        }
        component.set('v.msTransportes', msTransportes);
    }, 

    getColumns : function(component) { 
        component.set('v.columns', [
            {label: 'Tipo', fieldName: 'Tipo_de_Pedido__c', type: 'text'},
            {label: 'Folio Solicitud', fieldName: 'Folio_Control__c', type: 'text'},
            {label: 'Unidad Médica', fieldName: 'UMUName', type: 'text'}, 
            {label: 'Oficio', fieldName: 'Numero_de_Oficio__c', type: 'text'},
            {label: 'Fecha de Solicitud', fieldName: 'Fecha_de_Creacion__c', type: 'text'}, 
            {label: 'Detalles', type: 'button', initialWidth: 125, typeAttributes: {label: 'Ver Detalles', name: 'view_program', title: 'Click to View Program Details'}}
        ]);
    },
})