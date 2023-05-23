({
    // This function will be called on component initialization
    // Attaching a document listner to detect clicks on the page
    // 1. Handle logic when click on dropdown/picklist button itself
    // 2. Handle logic when picklist option is clicked
    // 3. Handle logic when anywhere within picklist is clicked
    // 4. Handle logic if clicked anywhere else
    // 5. Handle logic when quick search categories is clicked
    // 4. Handle logic if clear search values is clicked
    // This code was based on M. Choudharis work
    onRender : function(component, event, helper) {
        if(!component.get("v.initializationCompleted")){
            //Attaching document listener to detect clicks
            component.getElement().addEventListener("click", function(event){
                //handle click component
                helper.handleClick(component, event, 'component');
            });
            //Document listner to detect click outside multi select component
            document.addEventListener("click", function(event){
                helper.handleClick(component, event, 'document');
            });
            //Marking initializationCompleted property true
            component.set("v.initializationCompleted", true);
            //Set picklist name
            helper.setPickListName(component, component.get("v.selectedOptions"));
        }
    },
    
    // This function will be called when input box value change
    onInputChange : function(component, event, helper) {
        //get input box's value
        var inputText = event.target.value;
        //Filter options
        helper.filterDropDownValues(component, inputText);
    },
    
    // This function will be called when refresh button is clicked
    // This will clear any current filters in place
    onRefreshClick : function(component, event, helper) {
        //clear filter input box
        component.getElement().querySelector('#ms-filter-input').value = '';
        //reset filter
        helper.resetAllFilters(component);
    },

    // handleClearIndividualFilter : function(component, event, helper) {
    //     console.log("Inside handle clear individual filter");
    //     const clearClaves = event.getParam('clearClaves');
    //     const clearDelegaciones = event.getParam('clearDelegaciones');
    //     const clearUMUs = event.getParam('clearUMUs');
    //     const clearPedidos = event.getParam('clearPedidos');
    //     console.log(JSON.parse(JSON.stringify(clearPedidos)));
    //     var type = component.get('v.type');
    //     console.log(JSON.parse(JSON.stringify(type)));
    //     //clear selected options
    //     component.set("v.selectedOptions", []);
    //     //Clear check mark from drop down items
    //     helper.rebuildPicklist(component);
    //     //Set picklist name
    //     helper.setPickListName(component, component.get("v.selectedOptions"));
    //     //Set picklist icons (this code can be simplified)
    //     var type = component.get('v.type');
    //     if(type.includes('clave')){
    //         var padreFiltroClaves = component.get("v.padreFiltroClaves");                         
    //         padreFiltroClaves.resultadosDeClaves('clearValues');
    //     }else if(type.includes('umu')){
    //         var padreFiltroUnidadMedica = component.get("v.padreFiltroUnidadMedica"); 
    //         padreFiltroUnidadMedica.resultadosDeUMUs('clearValues');
    //     } else if(type.includes('estado')){
    //         var padreFiltroEstados = component.get("v.padreFiltroEstados"); 
    //         padreFiltroEstados.resultadosDeEstados('clearValues');
    //     } else if(type.includes('pedido')){
    //         var padreFiltroPedidos = component.get("v.padreFiltroPedidos"); 
    //         padreFiltroPedidos.resultadosDePedidos('clearValues');
    //     } else if(type.includes('transporte')){
    //         var padreFiltroTransportes = component.get("v.padreFiltroTransportes"); 
    //         padreFiltroTransportes.resultadosDeTransportes('clearValues');
    //     } else if(type.includes('delegacion')){
    //         var padreFiltroDelegaciones = component.get("v.padreFiltroDelegaciones"); 
    //         padreFiltroDelegaciones.resultadosDeDelegaciones('clearValues');
    //     }
    //     helper.closeAllDropDown();
    //     // if(clearParams){
    //     //     //clear selected options
    //     //     component.set("v.selectedOptions", []);
    //     //     //clear pillBox Values options
    //     //     component.set("v.pillBoxValues", []);
    //     //     //Clear check mark from drop down items
    //     //     helper.rebuildPicklist(component);
    //     //     //Set picklist name
    //     //     helper.setPickListName(component, component.get("v.selectedOptions"));
    //     // }
    // },

    // This function will be called when clear button is clicked
    // This will clear all selections from picklist and rebuild a fresh picklist
    
    onClearClick : function(component, event, helper) {
        //clear selected options
        component.set("v.selectedOptions", []);
        //clear pillBox Values options
        component.set("v.pillBoxValues", []);
        //Clear check mark from drop down items
        helper.rebuildPicklist(component);
        //Set picklist name
        helper.setPickListName(component, component.get("v.selectedOptions"));
        //Set picklist icons (this code can be simplified)
        var type = component.get('v.type');
        if(type.includes('clave')){
            var padreFiltroClaves = component.get("v.padreFiltroClaves");                         
            padreFiltroClaves.resultadosDeClaves('clearValues');
        }else if(type.includes('umu')){
            var padreFiltroUnidadMedica = component.get("v.padreFiltroUnidadMedica"); 
            padreFiltroUnidadMedica.resultadosDeUMUs('clearValues');
        } else if(type.includes('estado')){
            var padreFiltroEstados = component.get("v.padreFiltroEstados"); 
            padreFiltroEstados.resultadosDeEstados('clearValues');
        } else if(type.includes('pedido')){
            var padreFiltroPedidos = component.get("v.padreFiltroPedidos"); 
            padreFiltroPedidos.resultadosDePedidos('clearValues');
        } else if(type.includes('transporte')){
            var padreFiltroTransportes = component.get("v.padreFiltroTransportes"); 
            padreFiltroTransportes.resultadosDeTransportes('clearValues');
        } else if(type.includes('delegacion')){
            var padreFiltroDelegaciones = component.get("v.padreFiltroDelegaciones"); 
            padreFiltroDelegaciones.resultadosDeDelegaciones('clearValues');
        }
        helper.closeAllDropDown();
    },

    // This function will be called when clear button is clicked on the pillBox values
    // This will clear any current filters in place and also will crear the selected options
    handleItemRemove: function (component, event, helper) {
        var pillBoxValues = component.get('v.pillBoxValues');
        var selectedVal = event.getParam("index");
        helper.onOptionClick(component, pillBoxValues[selectedVal].label, true, false);
    },

    // This function will be called when clear search values is clicked
    handleClearFilters: function (component, event, helper) {
        var clearParams = event.getParam('clearValues');
        if(clearParams){
            //clear selected options
            component.set("v.selectedOptions", []);
            //clear pillBox Values options
            component.set("v.pillBoxValues", []);
            //Clear check mark from drop down items
            helper.rebuildPicklist(component);
            //Set picklist name
            helper.setPickListName(component, component.get("v.selectedOptions"));
        }
    }
})