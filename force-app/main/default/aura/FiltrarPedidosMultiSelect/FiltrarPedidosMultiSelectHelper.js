({
    // This function will close all multi-select drop down on the page
    // This code was based on M. Choudharis work
    closeAllDropDown: function() {
        //Close drop down by removing slds class
        Array.from(document.querySelectorAll('#ms-picklist-dropdown')).forEach(function(node){
            node.classList.remove('slds-is-open');
        });
    },
    
    // This function will be called on drop down button click
    // It will be used to show or hide the drop down
    onDropDownClick: function(dropDownDiv) {
        //Getting classlist from component
        var classList = Array.from(dropDownDiv.classList);
        if(!classList.includes("slds-is-open")){
            //First close all drp down
            this.closeAllDropDown();
            //Open dropdown by adding slds class
            dropDownDiv.classList.add('slds-is-open');
        } else{
           //Close all drp down
            this.closeAllDropDown();
        }
    },
    
    // This function will handle clicks on within and outside the component
    handleClick: function(component, event, where) {
        //getting target element of mouse click
        var tempElement = event.target;
        
        var outsideComponent = true;
        //click indicator
        //1. Drop-Down is clicked
        //2. Option item within dropdown is clicked
        //3. Clicked outside drop-down
        //loop through all parent element
        while(tempElement){
            if(tempElement.id === 'ms-list-item'){
                //2. Handle logic when picklist option is clicked
                //Handling option click in helper function
                if(where === 'component'){
                	this.onOptionClick(component, event.target, false, false);
                }
                break;
            } else if(tempElement.id === 'ms-dropdown-items'){
                //3. Clicked somewher within dropdown which does not need to be handled
                //Break the loop here
                outsideComponent = false;
                break;
            } else if(tempElement.id === 'ms-picklist-dropdown'){
                //1. Handle logic when dropdown is clicked
                if(where === 'component'){
                	this.onDropDownClick(tempElement);
                }
                outsideComponent = false;
                break;
            }
            //get parent node
            tempElement = tempElement.parentNode;
        }
        if(outsideComponent){
            this.closeAllDropDown();
        }
    },
    
    // This function will be used to filter options based on input box value
    rebuildPicklist: function(component) {
        var allSelectElements = component.getElement().querySelectorAll("li");
        Array.from(allSelectElements).forEach(function(node){
            node.classList.remove('slds-is-selected');
        });
    },
    
    // This function will be used to filter options based on input box value
    filterDropDownValues: function(component, inputText) {
        var allSelectElements = component.getElement().querySelectorAll("li");
        Array.from(allSelectElements).forEach(function(node){
            if(!inputText){
                node.style.display = "block";
            }
            else if(node.dataset.name.toString().toLowerCase().indexOf(inputText.toString().trim().toLowerCase()) != -1){
                node.style.display = "block";
            } else{
                node.style.display = "none";
            }
        }); 
    },

    // This function clear the filters
    resetAllFilters : function(component) {
        this.filterDropDownValues(component, '');
    },



    // This function will set text on picklist
    setPickListName : function(component, selectedOptions) {
        const maxSelectionShow = component.get("v.maxSelectedShow");
        //Set drop-down name based on selected value
        if(selectedOptions.length < 1){
            component.set("v.selectedLabel", component.get("v.msname"));
        } else if(selectedOptions.length > maxSelectionShow){
            component.set("v.selectedLabel", selectedOptions.length+' Opciones Seleccionadas');
        } else{
            var selections = '';
            selectedOptions.forEach(option => {
                selections += option.Name+',';
            });
            component.set("v.selectedLabel", selections.slice(0, -1));
        }

        // var type = component.get('v.type');
        // if(type.includes('clave')){
        //     var location = $A.get('$Resource.myCaryResources') + '/myCaryResources/assets/icons/loc.png';
        //     var pillBoxValues = [];
        //     // Set Pillbox values
        //     if(selectedOptions.length > 0){
        //         for(var i=0; i<selectedOptions.length; i++){
        //             pillBoxValues.push({
        //                 type: 'avatar',
        //                 href: '',
        //                 label: selectedOptions[i].Name,
        //                 src: location,
        //                 fallbackIconName: 'standard:store_group',
        //                 variant: 'square',
        //                 alternativeText: selectedOptions[i].Name,
        //             })
        //         }
        //         component.set("v.pillBoxValues", pillBoxValues );
        //     }
        // } else if(type.includes('umu')){
        //     var category = $A.get('$Resource.myCaryResources') + '/myCaryResources/assets/icons/cat.png';
        //     var pillBoxValues = [];
        //     // Set Pillbox values
        //     if(selectedOptions.length > 0){
        //         for(var i=0; i<selectedOptions.length; i++){
        //             pillBoxValues.push({
        //                 type: 'avatar',
        //                 href: '',
        //                 label: selectedOptions[i].Name,
        //                 src: category,
        //                 fallbackIconName: 'standard:folder',
        //                 variant: 'square',
        //                 alternativeText: selectedOptions[i].Name,
        //             })
        //         }
        //         component.set("v.pillBoxValues", pillBoxValues );
        //     }
        // } else if(type.includes('estado')){
        //     var subCategory = $A.get('$Resource.myCaryResources') + '/myCaryResources/assets/icons/sub.png';
        //     var pillBoxValues = [];
        //     // Set Pillbox values
        //     if(selectedOptions.length > 0){
        //         for(var i=0; i<selectedOptions.length; i++){
        //             pillBoxValues.push({
        //                 type: 'avatar',
        //                 href: '',
        //                 label: selectedOptions[i].Name,
        //                 src: subCategory,
        //                 fallbackIconName: 'standard:category',
        //                 variant: 'square',
        //                 alternativeText: selectedOptions[i].Name,
        //             })
        //         }
        //         component.set("v.pillBoxValues", pillBoxValues );
        //     }
        // } else if(type.includes('pedido')){
        //     var progAttributes = $A.get('$Resource.myCaryResources') + '/myCaryResources/assets/icons/attr.png';
        //     var pillBoxValues = [];
        //     // Set Pillbox values
        //     if(selectedOptions.length > 0){
        //         for(var i=0; i<selectedOptions.length; i++){
        //             pillBoxValues.push({
        //                 type: 'avatar',
        //                 href: '',
        //                 label: selectedOptions[i].Name,
        //                 src: progAttributes,
        //                 fallbackIconName: 'standard:product_required',
        //                 variant: 'square',
        //                 alternativeText: selectedOptions[i].Name,
        //             })
        //         }
        //         component.set("v.pillBoxValues", pillBoxValues );
        //     }
        // } else if(type.includes('transporte')){
        //     var patrTypes = $A.get('$Resource.myCaryResources') + '/myCaryResources/assets/icons/patr.png';
        //     var pillBoxValues = [];
        //     // Set Pillbox values
        //     if(selectedOptions.length > 0){
        //         for(var i=0; i<selectedOptions.length; i++){
        //             pillBoxValues.push({
        //                 type: 'avatar',
        //                 href: '',
        //                 label: selectedOptions[i].Name,
        //                 src: patrTypes,
        //                 fallbackIconName: 'standard:user',
        //                 variant: 'square',
        //                 alternativeText: selectedOptions[i].Name,
        //             })
        //         }
        //         component.set("v.pillBoxValues", pillBoxValues );
        //     }
        // } else if(type.includes('delegacion')){
        //     var patrTypes = $A.get('$Resource.myCaryResources') + '/myCaryResources/assets/icons/patr.png';
        //     var pillBoxValues = [];
        //     // Set Pillbox values
        //     if(selectedOptions.length > 0){
        //         for(var i=0; i<selectedOptions.length; i++){
        //             pillBoxValues.push({
        //                 type: 'avatar',
        //                 href: '',
        //                 label: selectedOptions[i].Name,
        //                 src: patrTypes,
        //                 fallbackIconName: 'standard:user',
        //                 variant: 'square',
        //                 alternativeText: selectedOptions[i].Name,
        //             })
        //         }
        //         component.set("v.pillBoxValues", pillBoxValues );
        //     }
        // } 
    },
    
    // This function will be called when an option is clicked from the drop down
    // It will be used to check or uncheck drop down items and adding them to selected option list
    // Also to set selected item value in input box
    onOptionClick: function(component, ddOption, removeFromPillBox, quickSearch) {
        // Determine if pillboxWasClicked
        var clickedValue = {};
        if(!removeFromPillBox){
            // get clicked option id-name pair
            clickedValue = {"Id":ddOption.closest("li").getAttribute('data-id'),
            "Name":ddOption.closest("li").getAttribute('data-name')};
        }else{
            // get clicked pillBox var id-name pair
            var availOpts = component.get('v.msoptions');
            var pillBoxName = ddOption;
            availOpts.forEach(option => {
                if(option.Name === pillBoxName){
                    clickedValue = option;
                }
            });
        }

        //Get all selected options
        var selectedOptions = component.get("v.selectedOptions");

        //Boolean to indicate if value is alredy present
        var alreadySelected = false;

        //Looping through all selected option to check if clicked value is already present
        selectedOptions.forEach((option,index) => {
            if(option.Id == clickedValue.Id){
                //Clicked value already present in the set
                selectedOptions.splice(index, 1);
                //Make already selected variable true	
                alreadySelected = true;
                //remove check mark for the list item
                if(!removeFromPillBox){
                    ddOption.closest("li").classList.remove('slds-is-selected');
                }else{
                    var allSelectElements = component.getElement().querySelectorAll("li");
                    Array.from(allSelectElements).forEach(function(node){
                        if(node.innerText === option.Name){
                            node.classList.remove('slds-is-selected');
                        }
                    });
                }
            }
        });

        //If not already selected, add the element to the list
        if(!alreadySelected){
            selectedOptions.push(clickedValue);
            //Add check mark for the list item
                ddOption.closest("li").classList.add('slds-is-selected');
        }

        //Clear selected list if its empty
        if(selectedOptions.length == 0){
            component.set('v.pillBoxValues', []);
        }

        //Set picklist label
        component.set('v.selectedOptions', selectedOptions);

        //Set picklist icons (this code can be simplified)
        var type = component.get('v.type');
        if(type.includes('clave')){
            var padreFiltroClaves = component.get("v.padreFiltroClaves");                         
            padreFiltroClaves.resultadosDeClaves(JSON.parse(JSON.stringify(selectedOptions)));
            this.setPickListName(component, selectedOptions);
        }else if(type.includes('umu')){
            var padreFiltroUnidadMedica = component.get("v.padreFiltroUnidadMedica"); 
            padreFiltroUnidadMedica.resultadosDeUMUs(JSON.parse(JSON.stringify(selectedOptions)));
            this.setPickListName(component, selectedOptions);
        } else if(type.includes('estado')){
            var padreFiltroEstados = component.get("v.padreFiltroEstados"); 
            padreFiltroEstados.resultadosDeEstados(JSON.parse(JSON.stringify(selectedOptions)));
            this.setPickListName(component, selectedOptions);
        } else if(type.includes('pedido')){
            var padreFiltroPedidos = component.get("v.padreFiltroPedidos"); 
            padreFiltroPedidos.resultadosDePedidos(JSON.parse(JSON.stringify(selectedOptions)));
            this.setPickListName(component, selectedOptions);
        } else if(type.includes('transporte')){
            var padreFiltroTransportes = component.get("v.padreFiltroTransportes"); 
            padreFiltroTransportes.resultadosDeTransportes(JSON.parse(JSON.stringify(selectedOptions)));
            this.setPickListName(component, selectedOptions);
        } else if(type.includes('delegacion')){
            var padreFiltroDelegaciones = component.get("v.padreFiltroDelegaciones"); 
            padreFiltroDelegaciones.resultadosDeDelegaciones(JSON.parse(JSON.stringify(selectedOptions)));
            this.setPickListName(component, selectedOptions);
        } 
    },

    onQuickSearchClick: function(component, ddOption, removeFromPillBox, quickSearch) {
        // Determine if pillboxWasClicked
        var clickedValue = {};
        if(!removeFromPillBox){
            if(quickSearch){
                var availOpts = component.get('v.msoptions');
                var pillBoxName = ddOption;
                availOpts.forEach(option => {
                    if(option.Name === pillBoxName){
                        clickedValue = option;
                    }
                });
            }
        }

        //Get all selected options
        var selectedOptions = component.get("v.selectedOptions");
        //Boolean to indicate if value is alredy present
        var alreadySelected = false;

        if(!alreadySelected){
            selectedOptions.push(clickedValue);
            //Add check mark for the list item
                // ddOption.closest("li").classList.add('slds-is-selected');
        }
    },

})