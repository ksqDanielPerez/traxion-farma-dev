import { LightningElement, wire, api, track} from 'lwc';
import { subscribe, MessageContext, publish } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {exportCSVFile} from 'c/utils';
import umuRecordSelected from '@salesforce/messageChannel/umu_record_selected__c';
import getCarritoData from '@salesforce/messageChannel/get_carrito_pedido__c';
import getActiveDpn from '@salesforce/apex/UserContactClass.getActiveDPNListFromUser';
import getDpnNoOrdinary from '@salesforce/apex/UserContactClass.getDpnNoOrdinary';
import getDisponibilidadData from '@salesforce/apex/UserContactClass.getDisponibilidadSkus';
import getSuppliesByProgram from '@salesforce/apex/SuppliesController.getSuppliesByProgram';
import orderType from '@salesforce/messageChannel/order_type__c';

const columns = [
    {label: 'Clave', fieldName: 'Clave', type: 'text'},
    {label: 'Descripción', fieldName: 'Descripcion', type: 'text'},
    {label: 'DPN', fieldName: 'DPN', type: 'text'},
    {label: 'Validado', fieldName: 'Validado', type: 'text'},
    {label: 'Disponible En DPN', fieldName: 'DisponibleEnDpn', type: 'text'},
    {label: 'Disponible en CENADI', fieldName: 'DisponibleASolicitar', type: 'text'},
    //{label: 'Existencia De Unidad', fieldName: 'ExistenciaDeUnidad', type: 'text'},
    //{label: 'Disponible En Cenadi', fieldName: 'DisponibleEnCenadi', type: 'text'},
    {label: 'En Tránsito', fieldName: 'EnTransito', type: 'text'},
    {label: 'Cantidad', fieldName: 'Cantidad', type: 'text', editable: true },
    {label: 'Acción', fieldName: 'Action', type: 'text'},
];

const columnsNoOrdinary = [
    {label: 'Clave', fieldName: 'Clave', type: 'text'},
    {label: 'Descripción', fieldName: 'Descripcion', type: 'text'},
    {label: 'Disponible en CENADI', fieldName: 'DisponibleASolicitar', type: 'text'},
    {label: 'En Tránsito', fieldName: 'EnTransito', type: 'text'},
    {label: 'Cantidad', fieldName: 'Cantidad', type: 'text', editable: true },
    {label: 'Acción', fieldName: 'Action', type: 'text'},
];

const pedidosCol = [
    {label: 'Clave', fieldName: 'Clave', type: 'text'},
    {label: 'Insumos', fieldName: 'Insumos', type: 'text'},
    {label: 'DPN', fieldName: 'Dpn', type: 'text'},
    {label: 'Cantidad Validada Acumulada', fieldName: 'CantidadValidadaAcumulada', type: 'text'},
    {label: 'Disponible En DPN', fieldName: 'DisponibleEnDpn', type: 'text'}
];

// Descripion, DPN , Validado, Disponible, Existencia de unidad, Disponible en Cenadi, en transito, Piezas(cantidad)
export default class InsumosTableList extends LightningElement {

    @wire(MessageContext)
    messageContext;

    // Boolean
    isUnidadMedica = true;
    isPedidos = false;
    isGenerarPedido = true;
    isShowDpnError = false;
    isLoading = false;
    isInputValidate = false;
    isMultiplo = true;
    isSecondStep = false;
    noOrdinary = false;
    isUmuSeleccionada = false;
    isDataLoading = true;
    isRendered = false;

    // Input Table Value
    pedidosCol = pedidosCol;
    columns = columns;
    columnsNoOrdinary = columnsNoOrdinary;

    // Array of object
    listaNuevosPedidos = [];
    dpnList = [];
    dpnSolicitarList = [];
    dpnCarrito = [];
    List = [];

    //obj
    error;

    // Text
    titleForSearch = 'Consultar DPN';
    search = '';
    accountId = '';

    // Number
    totalInsumos = 0;
    totalPiezas = 0;
    cantidad;

    //prueba
    claves = ['010000574100'];

    get tamañoValidoDeDPN(){
        return this.initialRecords.length > 0;
    }

    get mostrarOcultarTabla(){
        return this.isUmuSeleccionada;
    }

    get showTitleForSearch(){
        if(this.isGenerarPedido){
            return 'Consultar DPN'
        }else{
            return 'Insumos'
        }
    }

    containsObject(obj, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i] === obj) {
                return true;
            }
        }
        return false;
    }

    validateInput(element, insumo){
        var errorMessage = '';
        let isMultiplo = this.validateMultiplo(insumo.PiezaPorPaquete, element.value);

        
        if(element.value > insumo.DisponibleEnDpn && !this.noOrdinary){
            errorMessage = 'La cantidad de la DPN ha sido excedida';
        } else if(element.value > insumo.DisponibleASolicitar && this.noOrdinary){
            errorMessage = 'La cantidad disponible a solicitar ha sido excedida';
        } else if(!isMultiplo){
            errorMessage = `Este insumo solo puede solicitarse en múltiplos de ${insumo.PiezaPorPaquete}`;
        } else if(element.value <= 0 || element.value == null){
            errorMessage = 'La cantidad mínima a ingresar es 1';
        } else if(!Number.isInteger(Number(element.value))) {
            errorMessage = 'Ingrese números enteros, no decimales';
        }

        element.setCustomValidity(errorMessage);
        this.isInputValidate = (errorMessage === '');
        element.reportValidity();
    }

    validateMultiplo(multiplo, value) {
        if(typeof(multiplo) === 'undefined') return true;
        const arrayMultiplo = multiplo.split(",");
        if (arrayMultiplo.length > 1) {
          return arrayMultiplo.some((element) => value % element === 0);
        } else {
          return value % arrayMultiplo[0] === 0;
        }
    }

    handleOnChange(event){
        //this.cantidad = event.detail.value;
    }

    handleAgregarInsumo(event){
        const clave = event.target.dataset.id;
        const nombreBoton = event.target.dataset.name;
        const nuevoInsumo = this.List.find(ele => ele.Clave === clave);
        const input = this.template.querySelector(`lightning-input[data-id="${clave}"][data-element="input-field"]`);

        console.log('nuevoInsumo: ' + JSON.stringify(nuevoInsumo));
        console.log('input');
        console.log(JSON.parse(JSON.stringify(input)));

        this.cantidad = input.value;

        if(nombreBoton === "Add") {
            this.validateInput(input, nuevoInsumo);
            if(this.isInputValidate){
                nuevoInsumo.inputDisabled = true;
                nuevoInsumo.Cantidad = this.cantidad;
                nuevoInsumo.mostrarBoton = false;
                const hasKey = this.dpnCarrito.some(item => item.Clave === nuevoInsumo.Clave);
                //let isCantidadLowerThanDpn = nuevoInsumo.Cantidad <= nuevoInsumo.DPN ? true: false;

                if(!hasKey){
                    this.dpnCarrito.push(nuevoInsumo);

                    console.log('carro: ', JSON.stringify(this.dpnCarrito));

                    this.totalInsumos += 1;
                    this.totalPiezas += parseInt(nuevoInsumo.Cantidad);
                    this.showToast('Success', 'Producto agregado correctamente', 'success', 'pester');
                    const payload = {
                        Carrito: this.dpnCarrito
                    }
                    publish(this.messageContext, getCarritoData, payload);
                }
            }
        } else {
            nuevoInsumo.inputDisabled = false;
            nuevoInsumo.mostrarBoton = true;
            const hasKey = this.dpnCarrito.some(item => item.Clave === nuevoInsumo.Clave);

            if(hasKey){
                this.dpnCarrito = this.dpnCarrito.filter(item => item.Clave !== nuevoInsumo.Clave);

                console.log('carro: ', JSON.stringify(this.dpnCarrito));

                this.totalInsumos -= 1;
                this.totalPiezas -= parseInt(nuevoInsumo.Cantidad);
                this.showToast('Success', 'Producto removido correctamente', 'success', 'pester');
                const payload = {
                    Carrito: this.dpnCarrito
                }
                publish(this.messageContext, getCarritoData, payload);
            }
        }

        this.List = [...this.List];
    }

    handleRemovePedidos(event){
        const clave = event.target.dataset.id;
        const nuevoInsumo = this.List.find(ele => ele.Clave == clave);

        console.log(JSON.stringify(nuevoInsumo));

        nuevoInsumo.mostrarBoton = true;
        nuevoInsumo.inputDisabled = false;

        const nuevaLista = [...this.dpnCarrito];
        nuevaLista.pop(nuevoInsumo);

        this.dpnCarrito = nuevaLista;
        this.totalInsumos -= 1;
        this.totalPiezas = this.totalPiezas - nuevoInsumo.Cantidad;

        this.showToast('Success', 'Producto removido correctamente', 'Success', 'pester');
        const payload = {
            Carrito: ''
        }
        publish(this.messageContext, getCarritoData, payload);
    }

    susbcribeToMessageChannel(){
        subscribe(
            this.messageContext,
            SET_GENERAR_PEDIDOS_MENU,
            (message) => this.handleMessage(message)
        );
    }

    showToast(title, message, variant, mode) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: mode
        });
        this.dispatchEvent(event);
    }

    handleMessage(message){
        if(message.isSolicitarPedidos){
            this.isUnidadMedica = true;
            this.isPedidos = false;
            this.isGenerarPedido = false
            this.isSecondStep = true;

        }else if(message.isPedidos){
            this.isUnidadMedica = true;
            this.isPedidos = true;
            this.isGenerarPedido = false;
            this.isSecondStep = false;

        }else if(message.isGenerarPedidos){
            this.isGenerarPedido = true;
            this.isPedidos = false;
            this.isSecondStep = false;
            this.resetValues();
        }
        else{
            this.isUnidadMedica = false;
            this.isPedidos = false;
            this.isGenerarPedido = false;
        }

        console.log('---> MESSAGES');
        console.log(message.isSolicitarPedidos);
        console.log(message.isPedidos);
        console.log(message.isGenerarPedidos);
    }

    resetValues(){
        this.search = '';
        this.dpnList = [];
        this.List = [];
        this.dpnSolicitarList = this.List;
        this.dpnCarrito = [];
        this.totalInsumos = 0;
        this.totalPiezas = 0;
        this.isUmuSeleccionada = false;
    }

    renderedCallback() {
        if(!this.isRendered) {
            console.log('rendered table');
            this.susbcribeToMessageChannel();
            this.loadData();
            this.isRendered = true;
        }
    }

    loadData() {
        subscribe(
            this.messageContext,
            umuRecordSelected,
            (message) => this.handleAccount(message)
        );
    }

    handleAccount(message) {
        this.accountId = message.selectedUmu;
        console.log('message table umu: ' + this.accountId);
        this.loadOrderType()
    }

    loadOrderType() {
        return new Promise((resolve) => {
          subscribe(
            this.messageContext,
            orderType,
            (message) => {
              this.handleOrderType(message);
              resolve(); // Resuelve la promesa después de llamar a handleOrderType
            }
          );
        });
    }

    handleOrderType(message) {
        this.isDataLoading = true;
        this.noOrdinary = message.isNoOrdinario ? message.isNoOrdinario : false;
        console.log('message table order: ' + this.noOrdinary);
        this.handleLoadData();
    }

    columnHeader = ['CLAVE', 'INSUMO', 'DPN', 'CANTIDAD VALIDADA',
    'DISPONIBLE EN DPN', 'DISPONIBLE A SOLICITAR'];

    downloadCSVFile(){
        let doc;
        this.columnHeader.forEach(element => {
          if(doc) {
            doc += element + ',';
          } else {
            doc = element + ',';
          }
        });
        this.dpnList.forEach(record => {
          doc += '\n';
          doc += record.Clave + ',';
          doc += record.Descripcion + ',';
          doc += record.DPN + ',';
          doc += record.CantidadValidadaAcumulada + ',';
          doc += record.DisponibleEnDpn + ',';
          doc += record.DisponibleASolicitar + ',';
        });
        let downloadElement = document.createElement('a');
        downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(doc);
        downloadElement.target = '_self';
        downloadElement.download = 'Productos DPN.csv';
        document.body.appendChild(downloadElement);
        downloadElement.click();
    }

    initialRecords = [];
    isFirstTime = true;
    totalRecords = 0;
    currentPage = 1;
    actualRecords = 0;
    totalPages = 0;
    displayedItems = [];
    isFirstPage = true;
    isLastPage = false;
    pageSize = 5;

    resetPagination() {
        this.currentPage = 1;
        this.actualRecords = 0;
        this.isFirstTime = true;
    }

    async handleLoadData(message){
        console.log('Hi');
        console.log('message table handle load data: ' + this.noOrdinary);
        this.resetPagination();
        var payload = [];
        var productKeys = [];

        if(this.accountId == 'Seleccionar Unidad Medica'){
            this.resetValues();
            return;
        }

        this.isUmuSeleccionada = true;
        const getDpnData = this.noOrdinary ? getDpnNoOrdinary() : getActiveDpn({ accountId: this.accountId });

        try {
            const result = await getDpnData;

            result.forEach(item => {
                const { Product__r } = item;
                let consumido = item.Consumido__c > 0 && item.Consumido__c != null ? item.Consumido__c : 0;
                let disponible = item.L_mite_Mensual__c - consumido;
                let row = {
                    Id: Product__r.Id,
                    Clave: Product__r.Product_Code_ID__c,
                    Descripcion: Product__r.Name,
                    DPN: item.L_mite_Mensual__c,
                    CantidadValidadaAcumulada: consumido,
                    DisponibleEnDpn: disponible,
                    mostrarBoton: true,
                    inputDisabled: false,
                };
                productKeys.push(Product__r.Product_Code_ID__c);
                payload.push(row);
            });

            this.List = [...payload];
            this.handleDisponibilidad(productKeys);
            this.dpnList = this.List;
            this.initialRecords = this.List;
            this.totalPages = Math.ceil(this.dpnList.length / this.pageSize);
            this.totalRecords = this.dpnList.length;
            this.updateDisplayedItems();
        } catch (e) {
            console.log('An error has occurred ' + error.message);
            this.resetValues();
        }

        // if(!this.message) {
        //     getActiveDpn({ accountId: this.accountId }).then(result =>{
        //         result.forEach( item =>{
        //             let consumido = item.Consumido__c > 0 && item.Consumido__c != null ? item.Consumido__c : 0;
        //             let disponible = item.L_mite_Mensual__c - consumido;
        //             let row = {
        //                 Id: item.Product__r.Id,
        //                 Clave: item.Product__r.Product_Code_ID__c,
        //                 Descripcion: item.Product__r.Name,
        //                 DPN: item.L_mite_Mensual__c,
        //                 CantidadValidadaAcumulada: consumido,
        //                 DisponibleEnDpn: disponible,
        //                 mostrarBoton: true,
        //                 inputDisabled: false,
        //             }
        //             productKeys.push(item.Product__r.Product_Code_ID__c);
        //             payload.push(row);
        //         });
        //         this.List = [...payload];
        //         this.handleDisponibilidad(productKeys);
        //         this.dpnList = this.List;
        //         this.initialRecords = this.List;

        //         this.totalPages = Math.ceil(this.dpnList.length / this.pageSize);
        //         this.totalRecords = this.dpnList.length;
        //         this.updateDisplayedItems();

        //     }).catch(error =>{
        //         console.log('An error has occured ' + error.message);
        //         this.resetValues();
        //     })
        // } else {
        //     getDpnNoOrdinary().then(result => {
        //         result.forEach(item => {
        //             let row = {
        //                 Id: item.Product__r.Id,
        //                 Clave: item.Product__r.Product_Code_ID__c,
        //                 Descripcion: item.Product__r.Name,
        //                 mostrarBoton: true,
        //                 inputDisabled: false,
        //             }
        //             productKeys.push(item.Product__r.Product_Code_ID__c);
        //             payload.push(row);
        //         });
        //         this.List = [...payload];
        //         this.handleDisponibilidad(productKeys);
        //         this.dpnList = this.List;this.initialRecords = this.List;

        //         this.totalPages = Math.ceil(this.dpnList.length / this.pageSize);
        //         this.totalRecords = this.dpnList.length;
        //         this.updateDisplayedItems();
        //     }).catch(error =>{
        //         console.log('An error has occured ' + error.message);
        //         this.resetValues();
        //     })
        // }
        
    }

    updateDisplayedItems() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = this.currentPage * this.pageSize;
        this.displayedItems = this.dpnList.slice(startIndex, endIndex);
        this.isFirstPage = this.currentPage === 1;
        this.isLastPage = this.currentPage === this.totalPages;
    
        if(this.isFirstTime) {
          this.actualRecords += this.displayedItems.length;
          this.isFirstTime = false;
        }
    }

    handleNext(){
        if (this.currentPage < this.totalPages) {
          this.currentPage++;
          this.updateDisplayedItems();
          this.actualRecords += this.displayedItems.length;
        }
    }
    
    handlePrev(){
        if (this.currentPage > 1) {
          this.currentPage--;
          this.actualRecords -= this.displayedItems.length;
          this.updateDisplayedItems();
        }
    }

    handleDisponibilidad(idProducto){
        //productKeys
        let idProductos = JSON.stringify(idProducto);
        getDisponibilidadData({jsonData: idProductos}).then(result =>{
            const data = JSON.parse(result);
            const copiarLista = this.List.slice();

            // Accede a la lista de SKUs y haz algo con cada uno
            data.forEach(record => {
                copiarLista.forEach(element =>{
                    if(element.Clave == record.sku){
                        element.DisponibleASolicitar = record.availability;
                        element.PiezaPorPaquete = record.packages_details.length > 0 ? record.packages_details.map(piece => piece.quantity_pieces_package).join(", ") : 0;
                        //sku.packages_details.map(piece => piece.quantity_pieces_package).join(", ");
                    }
                })
            });
            this.dpnList = copiarLista;
            this.isDataLoading = false;
        }).catch(error =>{
            console.log('An error has occured: ' + error.message());
        })
    }

    getDpnBySearch(searchText){
        // verificar si el search value esta vacio, si es asi, retornar toda la lista.
        if(!searchText) {
            this.dpnList = this.List;
            this.dpnSolicitarList = this.List;
            return null;
        }

        let nuevaLista = this.dpnList.filter(element => {
             if (element.Clave == this.search) return element;
             else if(element.Descripcion.toLowerCase().includes(searchText))return element;
        })
        // console.log('Nueva Lista: ' + nuevaLista);
        if(nuevaLista) this.dpnList = nuevaLista;
        if(nuevaLista && this.isUnidadMedica) this.dpnSolicitarList = nuevaLista;
    }

    // handleOnSearch(event){
    //     this.isLoading = true;
    //     this.search = event.target.value;
    //     const count = this.search.split("");
    //     let isCount = count.length >= 3 ? true: false;

    //     if(isCount || count.length == 0) this.getDpnBySearch(this.search);

    //     this.isLoading = false;
    // }

    handleOnSearch(event) {
        const searchKey = event.target.value.toLowerCase();
        const previousPage = this.currentPage;
        let searchRecords = [];

        if(searchKey) {
            this.dpnList = this.initialRecords;
            if (this.dpnList) {
                for (let record of this.dpnList) {
                let valuesArray = Object.values(record);
                for (let val of valuesArray) {
                    let strVal = String(val);
                    if (strVal) {
                    if (strVal.toLowerCase().includes(searchKey)) {
                        searchRecords.push(record);
                        break;
                    }
                    }
                }
                }
                this.currentPage = 1;
                this.dpnList = searchRecords;
                this.updateDisplayedItems();

                console.log(searchRecords.length);
                if(searchRecords.length < 5 || previousPage === this.totalPages) this.isLastPage = true;
            }
        } else {
            console.log('en el else de buscar');
            this.dpnList = this.initialRecords;
            this.updateDisplayedItems();
        }

        this.actualRecords = (this.currentPage - 1) * this.pageSize + this.displayedItems.length;
        this.currentPage = previousPage;

        //console.log('Actual records: ' + JSON.stringify(this.actualRecords));
    }

    headers = {
        Clave: "Clave",
        Descripcion: "Insumos",
        DPN: "DPN",
        CantidadValidadaAcumulada: "Cantidad Validada Acumulada",
        CantidadSugerida: "Cantidad Sugerida",
        DisponibleEnDpn: "Disponible En Dpn"
    }

    htmlTableToExcel(){
       exportCSVFile(this.headers,this.dpnList,"dpn list");
    }

    getExternalProductData(clave){
        const json = '[{"sku":"010000574100" , "availability": 500, "package_key": true}, {"sku":"010000010300" , "availability": 500, "package_key": true}, {"sku":"010000010600" , "availability": 650, "package_key": true,"quantity_pieces_package": [8]}, {"sku":"010000010400" , "availability": 200, "package_key": true,"quantity_pieces_package": [50]}]';
        const skus = JSON.parse(json);
        const filter = skus.find(element => {
            if(element.sku === clave) return element;
        })
        return filter;
    }
}