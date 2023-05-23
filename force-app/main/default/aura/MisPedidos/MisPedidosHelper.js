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
            {label: 'Pedido', fieldName: 'ID_de_Pedido__c', type: 'text'},
            {label: 'Creación', fieldName: 'FechaCreacion', type: 'text'},
            {label: 'Máx Entrega', fieldName: 'FechaMaxEntrega', type: 'text'},
            {label: 'Claves', fieldName: 'Total_de_Claves_Solicitadas__c', type: 'number'},
            {label: 'Piezas', fieldName: 'Cantidad_Total_de_Piezas__c', type: 'number'},
            {label: 'Costo', fieldName: 'Costo_Total__c', type: 'currency'},
            {label: 'Orden', type: 'button', initialWidth: 125, typeAttributes: {label: 'Ver Detalles', name: 'view_program', title: 'Click to View Program Details'}}
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
                    this.mostrarDetalles(component, records, false);
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
                const action = component.get("c.getFilteredOrders");
                const fechaInicio = component.get("v.fechaInicio");
                const fechaFin = component.get("v.fechaFin");
                action.setParams({ 
                    fechaInicio : new Date(fechaInicio),
                    fechaFin : new Date(fechaFin)
                }); 
                action.setCallback(this, response => {
                    component.set("v.isLoading", false);
                    const state = response.getState();
                    if (state === "SUCCESS") {
                        const responseVal = response.getReturnValue();
                        responseVal.forEach(item => {
                            const { CreatedDate, Fecha_Limite_de_Entrega__c } = item;
                            if (!CreatedDate || !Fecha_Limite_de_Entrega__c) return;
                            const fechaCreacion = new Date(CreatedDate);
                            const fechaLimiteEntrega = new Date(Fecha_Limite_de_Entrega__c);
                            item.FechaCreacion = formatDate(fechaCreacion);
                            item.FechaMaxEntrega = formatDate(fechaLimiteEntrega);
                        });
                        function formatDate(date) {
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const year = date.getFullYear().toString();
                            return `${day}/${month}/${year}`;
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

        console.log("Inside check records by search phrase");

        let searchPhrase = component.get("v.searchPhrase") || '';
        let deliveryNumber = component.get("v.deliveryNumber") || '';

        console.log(JSON.parse(JSON.stringify(searchPhrase)));
        console.log(JSON.parse(JSON.stringify(deliveryNumber)));

        if (!$A.util.isEmpty(searchPhrase)) {
            let allData = component.get("v.allData");
            let filteredData = allData.filter((record) => {
                const { ID_de_Pedido__c = null } = record;
                return ID_de_Pedido__c ? searchPhrase === ID_de_Pedido__c : false;
            });
            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
        } 
        
        if (!$A.util.isEmpty(deliveryNumber)) {
            let allData = component.get("v.allData");
            let filteredData = allData.filter((record) => {
                const { Entrega__r = {} } = record;
                const { Name = null } = Entrega__r; 
                return Name ? deliveryNumber === Name : false;
            });
            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
        }
    },

    searchRecordsByFilters : function (component) {
        
        const allData = component.get("v.allData");
        const claves = component.get("v.clavesSeleccionadas");
        const umus = component.get("v.umusSeleccionadas");
        const estados = component.get("v.estadosSeleccionados");
        const pedidos = component.get("v.pedidosSeleccionados");

        console.log("Inside recs by filters");
        console.log(JSON.parse(JSON.stringify(pedidos)));

        if (claves.length > 0 || umus.length > 0 || estados.length > 0 || pedidos.length > 0) {
            const clavesArr = claves.map(obj => obj.Id);
            const umusArr = umus.map(obj => obj.Id);
            const estadosArr = estados.map(obj => obj.Id);
            const pedidosArr = pedidos.map(obj => obj.Id);

            const filteredData = allData.filter((orden) => {
                const { Order_Line_Items__r = [], UMU__r = {}, Tipo_de_Pedido__c = null } = orden;
                const { Clave_Presupuestal__c = null, Estado__c = null } = UMU__r;

                if(umusArr.length > 0){
                    const containsUmus = umusArr.includes(Clave_Presupuestal__c);
                    if(!containsUmus) return containsUmus;
                } 

                if(estadosArr.length > 0){
                    const containsEstados = estadosArr.includes(Estado__c);
                    if(!containsEstados) return containsEstados;
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

            console.log(JSON.parse(JSON.stringify(filteredData)));

            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
            this.mostrarDetalles(component, filteredData, false);
            this.mostrarOcultarFiltros(component);
        } else{
            component.set("v.filteredData", allData);
            this.preparePagination(component, allData); 
        }
    },

    mostrarDetalles : function(component, data, selectedRow) { 
        const fechaInicio = component.get('v.fechaInicio');
        const fechaFin = component.get('v.fechaFin');
        const rangoDeFechas = `${fechaInicio} - ${fechaFin}`;

        const appEvent = $A.get("e.c:mostrarDetalles"); 
        appEvent.setParams({ 
            "fechasSeleccionadas" : JSON.stringify(rangoDeFechas),
            "mostrarDetallesGenerales" : selectedRow
        }); 
        appEvent.fire(); 

        // Pfff no me gusta usar application event, pero pueeeeees...  
        if(selectedRow){
            const appRowEvent = $A.get("e.c:mostrarDetallesEspecificos"); 
            appRowEvent.setParams({
                "data" : JSON.stringify(data)
            }); 
            appRowEvent.fire(); 
        } else{
            const appGralEvent = $A.get("e.c:mostrarDetallesGenerales"); 
            appGralEvent.setParams({
                "data" : JSON.stringify(data)
            }); 
            appGralEvent.fire(); 
        } 
    },

    getFilterData : function(component, data) {
        const umus = new Set();
        const claves = new Set();
        const estados = new Set();
        const pedidos = new Set();

        data.forEach((orden) => {
            const { Order_Line_Items__r = [], UMU__r ={}, Tipo_de_Pedido__c = null} = orden;
            const {Clave_Presupuestal__c = null, Estado__c = null} = UMU__r;

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

            // Getting estados
            if (Estado__c) {
                const obj = {
                    Id: Estado__c,
                    Name: Estado__c,
                };
                if (![...estados].some((o) => o.Id === obj.Id)) {
                    estados.add(obj);
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
        component.set('v.msEstados', Array.from(estados));
        component.set('v.msPedidos', Array.from(pedidos)); 
    },

    // mostrarOcultarFiltros : function(component) {
    //     const x = document.getElementById("divFiltros");
    //     if (x.style.display === "none") {
    //         x.style.display = "block";
    //     } else {
    //         x.style.display = "none";
    //     } 

    //     const y = document.getElementById("divBtnMuestraFiltros");
    //     if (y.style.display === "none") {
    //         y.style.display = "block";
    //     } else {
    //         y.style.display = "none";
    //     } 
    // },  

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