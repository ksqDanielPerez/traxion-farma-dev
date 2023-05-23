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
    }, 

    setupDataTable: function (component) {
        component.set('v.columns', [
            {label: 'Tipo', fieldName: 'Tipo_de_Pedido__c', type: 'text'},
            {label: 'Folio Solicitud', fieldName: 'Folio_del_Pedido__c', type: 'text'},
            {label: 'Unidad Médica', fieldName: 'UMUName', type: 'text'}, 
            {label: 'Oficio', fieldName: 'Numero_de_Oficio__c', type: 'text'},
            {label: 'Fecha de Solicitud', fieldName: 'FechaCreacion', type: 'text'}, 
            {label: 'Detalles', type: 'button', initialWidth: 125, typeAttributes: {label: 'Ver Detalles', name: 'view_program', title: 'Click to View Program Details'}}
        ]);
    },

    setNonApprovalReasons : function(component) {
        component.set('v.nonApprovalReasons', [
            {'label': 'SIN EXISTENCIAS SUFICIENTES EN CENADI PARA OTORGARLE LA CANTIDAD SOLICITADA', 'value': 'SIN EXISTENCIAS SUFICIENTES EN CENADI PARA OTORGARLE LA CANTIDAD SOLICITADA'},
            {'label': 'ANEXAR GT1', 'value': 'ANEXAR GT1'},
            {'label': 'ANEXAR GT1 Y CONTRAREFERENCIA', 'value': 'ANEXAR GT1 Y CONTRAREFERENCIA'},
            {'label': 'SE ATENDERÁ POR GUÍA', 'value': 'SE ATENDERÁ POR GUÍA'},
            {'label': 'ANEXAR CENSO DE PACIENTES', 'value': 'ANEXAR CENSO DE PACIENTES'},
            {'label': 'ANEXAR CONTRAREFERENCIA', 'value': 'ANEXAR CONTRAREFERENCIA'},
            {'label': 'ENVIAR CENSO ACTUALIZADO CON DOSIS Y TIEMPO DE APLICACIÓN', 'value': 'ENVIAR CENSO ACTUALIZADO CON DOSIS Y TIEMPO DE APLICACIÓN'},
            {'label': 'SE SURTIRÁ UN MES DE SU DPN', 'value': 'SE SURTIRÁ UN MES DE SU DPN'},
            {'label': 'SIN EXISTENCIAS EN CENADI', 'value': 'SIN EXISTENCIAS EN CENADI'},
            {'label': 'VALIDAR EN TIEMPO Y FORMA SU DPN ASIGNADA', 'value': 'VALIDAR EN TIEMPO Y FORMA SU DPN ASIGNADA'},
            {'label': 'EXISTENCIAS SUFICIENTES EN LA UNIDAD MÉDICA', 'value': 'EXISTENCIAS SUFICIENTES EN LA UNIDAD MÉDICA'},
            {'label': 'PEDIDO DUPLICADO', 'value': 'PEDIDO DUPLICADO'},
            {'label': 'OTRO', 'value': 'OTRO'}
        ]);
    }, 
 
    getData: function (component) {
        return this.callAction(component)
            .then(
                $A.getCallback(records => {
                    component.set('v.allData', records);
                    component.set('v.filteredData', records);
                    this.getFilterData(component, records);
                    this.preparePagination(component, records);
                })
            )
            .catch(
                $A.getCallback(errors => {
                    if (errors && errors.length > 0) {
                        $A.get("e.force:showToast")
                            .setParams({
                                message: errors[0].message != null ? errors[0].message : errors[0],
                                type: "error"
                            })
                            .fire();
                    }
                })
            );
    },
 
    callAction: function (component) {
        component.set("v.isLoading", true);
        return new Promise(
            $A.getCallback((resolve, reject) => {
                const fechaInicio = component.get("v.fechaInicio");
                const fechaFin = component.get("v.fechaFin");

                const action = component.get("c.getFilteredOrdersToAuthorize");

                console.log("INSIDE CALL ACTION");
                console.log(component.get('v.selTabId'));

                action.setParams({
                    estatusNoOrdinario : component.get('v.selTabId'),
                    fechaInicio : new Date(fechaInicio),
                    fechaFin : new Date(fechaFin)                
                }); 

                action.setCallback(this, response => {
                    component.set("v.isLoading", false);
                    const state = response.getState();

                    console.log("PRINTING THIS PAL");
                    console.log(state);

                    if (state === "SUCCESS") {
                        const responseVal = response.getReturnValue();

                        console.log(JSON.parse(JSON.stringify(responseVal))); 

                        function formatDate(date) {
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const year = date.getFullYear().toString();
                            return `${day}/${month}/${year}`;
                        }

                        for(let i=0; i < responseVal.length; i++) {
                            const order = responseVal[i];
                            const {CreatedDate, Order_Line_Items__r, UMU__r = {}} = order; 
                            const {Name = ''} = UMU__r; 
                            order.UMUName = Name;
                            const fechaCreacion = new Date(CreatedDate);
                            const formattedFechaCreacion = formatDate(fechaCreacion);
                            order.FechaCreacion = formattedFechaCreacion;
                        }
                        return resolve(responseVal);
                    } else if (state === "ERROR") {
                        return reject(response.getError());
                    }
                    return null;
                });
                $A.enqueueAction(action);
            })
        );
    },
 
    preparePagination: function (component, imagesRecords) {
        let countTotalPage = Math.ceil(imagesRecords.length/component.get("v.pageSize"));
        let totalPage = countTotalPage > 0 ? countTotalPage : 1;
        component.set("v.totalPages", totalPage);
        component.set("v.currentPageNumber", 1);
        this.setPageDataAsPerPagination(component);
    },
 
    setPageDataAsPerPagination: function(component) {
        let data = [];
        let pageNumber = component.get("v.currentPageNumber");
        let pageSize = component.get("v.pageSize");
        let filteredData = component.get('v.filteredData');
        let x = (pageNumber - 1) * pageSize;
        for (; x < (pageNumber) * pageSize; x++){
            if (filteredData[x]) {
                data.push(filteredData[x]);
            }
        }
        component.set("v.tableData", data);
    },
 
    searchRecordsBySearchPhrase : function (component) {
        let searchPhrase = component.get("v.searchPhrase"); 
        if (!$A.util.isEmpty(searchPhrase)) {
            let allData = component.get("v.allData");
            let filteredData = allData.filter(record => [record.Folio_del_Pedido__c].includes(searchPhrase));
            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
        }
    },

    searchOLIBySelection : function (component, order) { 

        console.log("INSIDE SEARCH OLI BY SELECTION");
        console.log(JSON.parse(JSON.stringify(order)));

        const {Folio_del_Pedido__c = null, ID_de_Pedido__c=null, Mostrar_Autorizaci_n__c=null} = order;
        const headerOrdenSeleccionada = Folio_del_Pedido__c && ID_de_Pedido__c ? `${Folio_del_Pedido__c} | ${ID_de_Pedido__c}` : 
            Folio_del_Pedido__c ? `${Folio_del_Pedido__c}` : 
            ID_de_Pedido__c ? `${ID_de_Pedido__c}` : '';
        component.set('v.headerOrdenSeleccionada', headerOrdenSeleccionada);
        component.set('v.showHideAutorizacion', !Mostrar_Autorizaci_n__c);

        this.renderTitulo(component, order);
        this.renderInformacionGeneral(component, order);
        this.renderJustificacionDocumentos(component, order);
        this.renderDataTable(component, order);
        this.showModal(component);  
    },
    
    renderTitulo : function(component, rowData) {
        const {Tipo_de_Pedido__c = null, Folio_Control__c = null, ID_de_Pedido__c = null, UMUName = null, Contacto__r = {}} = rowData; 
        const {Name = null} = Contacto__r;
        const rowTitulo = {
            tipo : Tipo_de_Pedido__c,
            detalle : Folio_Control__c && ID_de_Pedido__c && UMUName ? `${Folio_Control__c} | ${ID_de_Pedido__c} | ${UMUName}`
                    : ID_de_Pedido__c && UMUName ? `${ID_de_Pedido__c} | ${UMUName}` : null,
            nombre : Name
        } 
        component.set('v.rowTitulo', rowTitulo);
    },

    renderInformacionGeneral : function(component, rowData) {
        const {UMU__r = {}, Fecha_de_Creacion__c = null, Aprobado_Por__r = {}} = rowData; 
        const {Clave_Presupuestal__c = null, Name = null, Delegacion__c = null, Tipo_UMU__c = null, UMU__c = null} = UMU__r;
      
        const informacionGralArr = [];
        function populateArr(field, label){
            if(field){
                informacionGralArr.push({
                    label : label,
                    value : field
                })
            }
        }
        populateArr(Clave_Presupuestal__c, 'Clave Presupuestal:');
        populateArr(Name, 'Nombre de UMU:');
        populateArr(Delegacion__c, 'Delegación:');
        populateArr(Tipo_UMU__c, 'Tipo de Unidad Médica:');
        populateArr(UMU__c, 'Numero de UMU:');
        populateArr(Aprobado_Por__r.Name, 'Aprobado Por:');
        populateArr(Fecha_de_Creacion__c, 'Fecha de Solicitud:');
        component.set('v.informacionGralArr', informacionGralArr);
    },

    renderJustificacionDocumentos : function(component, rowData) {
        const {Id = null} = rowData; 
        $A.createComponent(
            "c:filesContainer",
            {orderId : Id},
            function(newCmp) {
                if (component.isValid()) { 
                    component.set('v.justificacionyDocumentos', newCmp);
                }
            }
        );
    },

    searchRecordsByFilters : function (component) {
        const allData = component.get("v.allData");
        const claves = component.get("v.clavesSeleccionadas");
        const umus = component.get("v.umusSeleccionadas");
        const delegaciones = component.get("v.delegacionesSeleccionadas");
        const pedidos = component.get("v.pedidosSeleccionados");

        if (claves.length > 0 || umus.length > 0 || delegaciones.length > 0) {
            const clavesArr = claves.map(obj => obj.Id);
            const delegacionesArr = delegaciones.map(obj => obj.Id);
            const umusArr = umus.map(obj => obj.Id);
            const pedidosArr = pedidos.map(obj => obj.Id);

            const filteredData = allData.filter((orden) => {
                const { Order_Line_Items__r = [], UMU__r = {} } = orden;
                const { Clave_Presupuestal__c = null, Tipo_de_Pedido__c = null, Delegacion__c = null } = UMU__r;

                if(umusArr.length > 0){
                    const containsUmus = umusArr.includes(Clave_Presupuestal__c);
                    if(!containsUmus) return containsUmus;
                } 

                if(delegacionesArr.length > 0){
                    const containsDelegaciones = delegacionesArr.includes(Delegacion__c);
                    if(!containsDelegaciones) return containsDelegaciones;
                } 

                if(pedidosArr.length > 0){
                    const containsPedidos = pedidosArr.includes(Tipo_de_Pedido__c);
                    if(!containsPedidos) return containsPedidos;
                } 

                if(Order_Line_Items__r.length > 0){
                    return Order_Line_Items__r.some((oli) => {
                        const { Product__r = {} } = oli;
                        const { Product_Code_ID__c = null } = Product__r;
                        if(clavesArr.length > 0){
                            const containsClaves = clavesArr.includes(Product_Code_ID__c);
                            if(!containsClaves) return containsClaves;
                        } 
                        return true;
                    });
                }

                return true;
            });

            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
            this.mostrarOcultarFiltros(component);
        } else{
            component.set("v.filteredData", allData);
            this.preparePagination(component, allData); 
        }
    },

    renderDataTable : function(component, rowData) {
        const sortedDataTable = [];
        const selectedTab = component.get('v.selTabId');
        const { Order_Line_Items__r = [] } = rowData;

        function filterArrayOfObj(estatus){
            Order_Line_Items__r.forEach(function(oli){
                if(oli.Estatus_Autorizaci_n__c === selectedTab){
                    oli.EstatusActivo = true;
                }
                if(oli.Estatus_Autorizaci_n__c === estatus){
                    oli[estatus] = true;
                    sortedDataTable.push(oli);
                }
            });
        }
        
        switch (selectedTab) {
            case 'Pendiente':
                filterArrayOfObj('Pendiente');
                filterArrayOfObj('Autorizado');
                filterArrayOfObj('Modificado');
                filterArrayOfObj('Rechazado');
                break;
            case 'Autorizado':
                filterArrayOfObj('Autorizado');
                filterArrayOfObj('Modificado');
                filterArrayOfObj('Pendiente');
                filterArrayOfObj('Rechazado');
                break;
            case 'Rechazado':
                filterArrayOfObj('Rechazado');
                filterArrayOfObj('Autorizado');
                filterArrayOfObj('Modificado');
                filterArrayOfObj('Pendiente');
                break;
        }
        component.set("v.sortedDataTable", sortedDataTable); 
    },

    showModal : function(component) {
        const showModal = component.get("v.showModal");
        const mainCmp = component.find('maincmp');
        !showModal ? $A.util.addClass(mainCmp, 'blur-main-cmp') : $A.util.removeClass(mainCmp, 'blur-main-cmp');
        component.set("v.showModal", true);
    },

    getFilterData : function(component, data) {
        const umus = new Set();
        const claves = new Set();
        const delegaciones = new Set();
        const pedidos = new Set();

        data.forEach((orden) => {
            const { Order_Line_Items__r = [], UMU__r ={}, Tipo_de_Pedido__c = null} = orden;
            const {Clave_Presupuestal__c = null, Delegacion__c = null} = UMU__r;

            // Getting umus
            if (Clave_Presupuestal__c && UMU__r.Name) {
                const obj = {
                    Id: Clave_Presupuestal__c,
                    Name: `${Clave_Presupuestal__c} - ${UMU__r.Name}`,
                };
                if (![...umus].some((o) => o.Id === obj.Id)) {
                    umus.add(obj);
                }
            }


            // Getting delegaciones
            if (Delegacion__c) {
                const obj = {
                    Id: Delegacion__c,
                    Name: Delegacion__c,
                };
                if (![...delegaciones].some((o) => o.Id === obj.Id)) {
                    delegaciones.add(obj);
                }
            }

            // Getting pedidos
            if (Tipo_de_Pedido__c) {
                const obj = {
                    Id: Tipo_de_Pedido__c,
                    Name: Tipo_de_Pedido__c,
                };
                if (![...pedidos].some((o) => o.Id === obj.Id)) {
                    pedidos.add(obj);
                }
            }

            Order_Line_Items__r.forEach((oli) => {
                const { Product__r = {} } = oli;

                // Getting claves
                const { Product_Code_ID__c = null, Name = null} = Product__r;
                if (Product_Code_ID__c && Name) {
                    const obj = {
                        Id: Product_Code_ID__c,
                        Name: `${Product_Code_ID__c} - ${Name}`,
                    };
                    if (![...claves].some((o) => o.Id === obj.Id)) {
                        claves.add(obj);
                    }
                }
            });
        });

        component.set('v.msClaves', Array.from(claves));
        component.set('v.msUMUs', Array.from(umus)); 
        component.set('v.msDelegaciones', Array.from(delegaciones));
        component.set('v.msPedidos', Array.from(pedidos)); 
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

    handleAuthorize : function(component, authorizedRow) {
        console.log("Inside handle approve");
        console.log(JSON.parse(JSON.stringify(authorizedRow)));

        const { Id = null, Cantidad_Aprobada__c = 0 } = authorizedRow;
        if(!Id) return;
        const message = '';
        const actionType = 'Autorizado';
        const authorizedQty = Cantidad_Aprobada__c;
        this.updateOLI(component, Id, actionType, authorizedQty, message);
    },

    handleDisplayModifyModal : function(component, oliToModify) {   
        component.set('v.oliToModify', oliToModify);

        $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
        $('#modificaOrderLineItem').keyup(function(event){
            if (event.keyCode == 27){
                // Close the modal/menu
                $A.util.toggleClass(component.find("modificaOrderLineItem"), 'slds-hide');
            }
        }); 
    },

    handleModify : function(component, modifiedRow) {
        const { Id = null } = modifiedRow; 
        const amountToModify = component.get('v.amountToModify');
        if(!Id || !amountToModify) return;
        const message = component.get('v.selectedModificationReason') || ''; 
        const actionType = 'Modificado';
        const approvedQty = amountToModify;
        this.updateOLI(component, Id, actionType, approvedQty, message);
    },

    handleDisplayRejectModal : function(component, oliToReject) { 
        component.set('v.oliToReject', oliToReject);

        $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
        $('#rechazoOrderLineItem').keyup(function(event){
            if (event.keyCode == 27){
                // Close the modal/menu
                $A.util.toggleClass(component.find("rechazoOrderLineItem"), 'slds-hide');
            }
        }); 
    },

    handleReject : function(component, rejectedRow) {
        const { Id = null } = rejectedRow; 
        if(!Id) return; 
        const message = component.get('v.selectedRejection') || ''; 
        const actionType = 'Rechazado';
        const approvedQty = 0;
        this.updateOLI(component, Id, actionType, approvedQty, message);
    },

    updateOLI : function(component, oliId, actionType, quantity, message) {
        console.log("Inside update oli")

        const action = component.get("c.updateOrderLineItemToAuthorize");
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
                console.log(JSON.parse(JSON.stringify(responseVal)));
                component.set('v.showHideAutorizacion', !responseVal[0].Mostrar_Autorizaci_n__c); 
                this.renderDataTable(component, responseVal[0]);
                component.set("v.isLoading", false);
                this.showToast(component, 'Actualización exitosa', 'success', `El registro ha sido ${actionType} exitosamente`);
            } else{
                component.set("v.isLoading", false);
                console.log(response.getError());
            }
        });
        $A.enqueueAction(action);
    },

    authorizeOrder : function(component) {
        console.log("Inside authorize order");
        const action = component.get("c.updateAuthorizationIdDePedidoFromOrder");
        action.setParams({
            "orderId" : component.get('v.clickedOrderId')
        });
        action.setCallback(this, function(response) { 
            const state = response.getState();
            console.log(state);
            if (state === "SUCCESS") {
                const responseVal = response.getReturnValue();
                console.log(JSON.parse(JSON.stringify(responseVal)));
                const order = responseVal;
                const {UMU__r = {}} = order; 
                const {Name = ''} = UMU__r; 
                order.UMUName = Name;
                this.searchOLIBySelection(component, order);
                this.getData(component);

                const mainCmp = component.find('maincmp');
                $A.util.addClass(mainCmp, 'blur-main-cmp'); 

                component.set("v.isLoading", false);
                this.showToast(component, 'Actualización exitosa', 'success', `El registro ha sido enviado a autorización exitosamente`);
            } else{
                console.log(response.getError());
                component.set("v.isLoading", false);
            }
        });
        $A.enqueueAction(action);
    },

    showToast : function(component, title, type, message) {
        const toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
            "title": title,
            "type" : type,
            "message": message
        });
        toastEvent.fire();
    }
})