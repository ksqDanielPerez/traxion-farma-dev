({
    setupDataTable: function (component) {
        component.set('v.columns', [
            {label: 'Tipo', fieldName: 'Tipo_de_Pedido__c', type: 'text'},
            {label: 'Pedido', fieldName: 'ID_de_Pedido__c', type: 'text'},
            {label: 'Creación', fieldName: 'FechaCreacion', type: 'text'},
            {label: 'Máx Entrega', fieldName: 'FechaMaxEntrega', type: 'text'},
            {label: 'Claves', fieldName: 'Total_de_Claves_Solicitadas__c', type: 'number'},
            {label: 'Piezas', fieldName: 'Total_de_Piezas__c', type: 'number'},
            {label: 'Costo', fieldName: 'Costo_Total__c', type: 'currency'},
            {label: 'Orden', type: 'button', initialWidth: 125, typeAttributes: {label: 'Ver Detalles', name: 'view_program', title: 'Click to View Program Details'}}
        ]);
    },
 
    getData: function (component) {
        return this.callAction(component)
            .then(
                $A.getCallback(imageRecords => {


                    component.set('v.allData', imageRecords);
                    component.set('v.filteredData', imageRecords);
                    
                    console.log("***PRINTING ALL RECORDS***")
                    console.log(JSON.parse(JSON.stringify(imageRecords)));
                    
                    this.preparePagination(component, imageRecords);
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
                const action = component.get("c.getImageRecords");

                const fechaActual = new Date();
                const anioActual = fechaActual.getFullYear();
                const mesActual = fechaActual.getMonth() + 1;
                const diaActual = fechaActual.getDate(); 
                const fechaFin = `${anioActual}-${mesActual}-${diaActual}`;

                let fechaHaceTresMeses = new Date(fechaActual);
                fechaHaceTresMeses.setMonth(fechaHaceTresMeses.getMonth() - 3);
                const anioPasado = fechaHaceTresMeses.getFullYear();
                const mesPasado = fechaHaceTresMeses.getMonth() + 1;
                const diaPasado = fechaHaceTresMeses.getDate(); 
                const fechaInicio = `${anioPasado}-${mesPasado}-${diaPasado}`;

                action.setParams({ 
                    clavesSeleccionadas : [],
                    umusSeleccionadas : [],
                    estadosSeleccionados : [],
                    pedidosSeleccionados : [],
                    transportesSeleccionados : [],
                    fechaInicio : new Date(fechaInicio),
                    fechaFin : new Date(fechaFin)
                }); 

                action.setCallback(this, response => {
                    component.set("v.isLoading", false);
                    const state = response.getState();
                    if (state === "SUCCESS") {
                        return resolve(response.getReturnValue());
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
        console.log("Inside search by phrase");
        let searchPhrase = component.get("v.searchPhrase");
        console.log(searchPhrase);
        console.log(!$A.util.isEmpty(searchPhrase));

        if (!$A.util.isEmpty(searchPhrase)) {
            let allData = component.get("v.allData");
            let filteredData = allData.filter(record => record.ID_de_Pedido__c.includes(searchPhrase));

            console.log(filteredData);

            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
        }
    },

    searchRecordsBySearchClave : function (component) {
        console.log("Inside search by clave");
        
        let claves = ['010000053700', '010000010400'];

        if (claves.length > 0) {
            console.log("Inside clave");
            let allData = component.get("v.allData");
            console.log(allData);
            const filteredData = allData.filter((orden) => {
                const { Order_Line_Items__r = [] } = orden;
                return Order_Line_Items__r.some((oli) => {
                    const { Product__r = {} } = oli;
                    const { Product_Code_ID__c = null } = Product__r;
                    return claves.includes(Product_Code_ID__c);
                });
            });

            console.log(filteredData);

            component.set("v.filteredData", filteredData);
            this.preparePagination(component, filteredData);
        }
    },

})