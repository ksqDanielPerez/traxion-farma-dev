import { LightningElement, wire} from 'lwc';
import { subscribe, MessageContext, publish } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {exportCSVFile} from 'c/utils';
import umuRecordSelected from '@salesforce/messageChannel/umu_record_selected__c';
import getCarritoData from '@salesforce/messageChannel/get_carrito_pedido__c';
import getActiveDpn from '@salesforce/apex/UserContactClass.getActiveDPNListFromUser';
import getDisponibilidadData from '@salesforce/apex/UserContactClass.getDisponibilidadSkus';


const columns = [
    {label: 'Descripción', fieldName: 'Descripcion', type: 'text'},
    {label: 'DPN', fieldName: 'DPN', type: 'text'},
    {label: 'Validado', fieldName: 'Validado', type: 'text'},
    {label: 'Disponible En DPN', fieldName: 'DisponibleEnDpn', type: 'text'},
    {label: 'Disponible a Solicitar', fieldName: 'DisponibleASolicitar', type: 'text'},
    {label: 'Existencia De Unidad', fieldName: 'ExistenciaDeUnidad', type: 'text'},
    {label: 'Disponible En Cenadi', fieldName: 'DisponibleEnCenadi', type: 'text'},
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

    isUmuSeleccionada = false;
   
    // Input Table Value
    pedidosCol = pedidosCol;
    columns = columns;

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
        return this.dpnList.length > 0;
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
        //  console.log('Validar Data: ' + JSON.stringify(insumo));
        var errorMessage = ''; 
        let isMultiplo = this.validateMultiplo(insumo.PiezaPorPaquete, element.value);  

        // console.log('Insumos: ' + JSON.stringify(insumo));
        if(element.value > insumo.DisponibleEnDpn){
            errorMessage = errorMessage + "DPN Excedido. ";
            element.setCustomValidity(errorMessage);
            this.isInputValidate = false;
        }
        else if(!isMultiplo){
            errorMessage = errorMessage + `Este insumo solo puede solicitarse en múltiplos de ${insumo.PiezaPorPaquete}`;
            element.setCustomValidity(errorMessage);
            this.isInputValidate = false;
        }else{
            element.setCustomValidity("");
            this.isInputValidate = true;
            //element.disabled = true;
        }
            element.reportValidity();
    }


    validateMultiplo(multiplo, value){ 
        if(typeof(multiplo) === 'undefined')return true; 
        const even = value % multiplo === 0;
        return even;
    }

    handleAgregarInsumo(event){
        
        var inputElement = {};
        let clave = event.target.dataset.id;
        var nuevoInsumo = this.List.find(ele => ele.Clave == clave);

        const allValid = [
            ...this.template.querySelectorAll('[data-element="input-field"]'),
        ].forEach((element) => {
                // console.log('Agregando: ' + element.getAttribute('data-id'));
                if(element.getAttribute('data-id') === clave){
                    // console.log('Value: ' + element.value);
                    inputElement = element;
                }  
        });    

        this.validateInput(inputElement, nuevoInsumo);

        if(this.isInputValidate){
            //console.log('Producto a agregar: ' + JSON.stringify(nuevoInsumo));
            nuevoInsumo.Cantidad = this.cantidad;
            const hasKey = this.containsObject(nuevoInsumo, this.dpnCarrito);
            let isCantidadLowerThanDpn = nuevoInsumo.Cantidad <= nuevoInsumo.DPN ? true: false;

            if(!hasKey && nuevoInsumo.Cantidad > 0 && isCantidadLowerThanDpn){
                const nuevoPedido = this.dpnCarrito.slice();
                nuevoPedido.push(nuevoInsumo);
                this.dpnCarrito = nuevoPedido;
                this.totalInsumos += 1; 
                this.totalPiezas = parseInt(nuevoInsumo.Cantidad)+ this.totalPiezas;
                this.showToast('Success', 'Producto ha sido agregado.', 'success', 'pester');
                
                const payload = {
                    Carrito: this.dpnCarrito
                }
                // console.log('Item carrito publicar: ' + JSON.stringify(payload));
                publish(this.messageContext, getCarritoData, payload);
            }
        }

    }

    handleRemovePedidos(event){
        const nuevoInsumo = this.List.find(ele => ele.Clave == event.target.dataset.id);
       
        const nuevaLista = [...this.dpnCarrito];
        nuevaLista.pop(nuevoInsumo);

        this.dpnCarrito = nuevaLista;
        this.totalInsumos -= 1; 
        this.totalPiezas = this.totalPiezas - nuevoInsumo.Cantidad;

        this.showToast('Success', 'Producto ha sido removido.', 'Success', 'pester');
        
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
        }else if(message.isPedidos){
            this.isUnidadMedica = true;
            this.isPedidos = true;
            this.isGenerarPedido = false;
          
        }else if(message.isGenerarPedidos){
            this.isGenerarPedido = true;
            this.isPedidos = false;
            this.resetValues();
        }
        else{
            this.isUnidadMedica = false;
            this.isPedidos = false;
            this.isGenerarPedido = false;
        }
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

    loadData(){
        // get umu id from message channel
        subscribe(
            this.messageContext,
            umuRecordSelected,
            (message) => this.handleLoadData(message)
        );
    }

    handleLoadData(message){
        this.accountId = message.selectedUmu;
        var payload = [];
        var productKeys = [];
        if(this.accountId == 'Seleccionar Unidad Medica'){
            this.resetValues();
        } else{
            this.isUmuSeleccionada = true;
            getActiveDpn({ accountId: this.accountId }).then(result =>{ 
                result.forEach( item =>{
                    // mapped data
                    let disponible = item.L_mite_Mensual__c - item.Consumido__c;
                    let row = {
                    Id: item.Product__r.Id,
                    Clave: item.Product__r.Product_Code_ID__c,
                    Descripcion: item.Product__r.Name,
                    DPN: item.L_mite_Mensual__c,
                    CantidadValidadaAcumulada: item.Consumido__c,
                    DisponibleEnDpn: disponible,
                    }
                    productKeys.push(item.Product__r.Product_Code_ID__c);
                    payload.push(row);
                });
                this.List = [...payload];
                this.handleDisponibilidad(productKeys);
                this.dpnList = this.List;

            }).catch(error =>{
                console.log('An error has occured ' + error.message);
                this.resetValues();
            })
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
                        element.PiezaPorPaquete = record.packages_details.length > 0 ? record.packages_details[0].quantity_pieces_package : 0;
                    }
                })
            });
            this.dpnList = copiarLista;
        }).catch(error =>{
            console.log('An error has occured: ' + error.message());
        })
    }

    connectedCallback(){
        this.loadData();
        this.susbcribeToMessageChannel();
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
        if(nuevaLista && this.isUnidadMedica)this.dpnSolicitarList = nuevaLista;
    }

    handleOnChange(event){
        this.cantidad = event.detail.value;
    }

    handleOnSearch(event){
        this.isLoading = true;
        this.search = event.target.value;
        const count = this.search.split("");
        
        let isCount = count.length >= 3 ? true: false;

        if(isCount || count.length == 0){
            this.getDpnBySearch(this.search);
        }
        this.isLoading = false;
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
       // console.log('Export csv');
       exportCSVFile(this.headers,this.dpnList,"dpn list");
    }

    getExternalProductData(clave){
        const json = '[{"sku":"010000574100" , "availability": 500, "package_key": true}, {"sku":"010000010300" , "availability": 500, "package_key": true}, {"sku":"010000010600" , "availability": 650, "package_key": true,"quantity_pieces_package": [8]}, {"sku":"010000010400" , "availability": 200, "package_key": true,"quantity_pieces_package": [50]}]';
        
        //
        const skus = JSON.parse(json);

        const filter = skus.find(element => {
            // console.log('Clave a buscar: ' + typeof(clave));
            // console.log('Elemento: ' + typeof(element.sku));
            if(element.sku === clave) return element;
        })

        // console.log('Filter: ' + JSON.stringify(filter));
        return filter;

    }

}