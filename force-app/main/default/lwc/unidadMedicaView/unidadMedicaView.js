import { LightningElement, wire, track, api } from 'lwc';
import { subscribe, MessageContext } from 'lightning/messageService';
import SET_GENERAR_PEDIDOS_MENU from '@salesforce/messageChannel/set_generar_pedidos_menu__c';
import umuRecordSelected from '@salesforce/messageChannel/umu_record_selected__c';
import getCarritoData from '@salesforce/messageChannel/get_carrito_pedido__c';
import crearOrden from '@salesforce/apex/controladorGeneracionPedidos.deserializeOrders';
import generarPdf from '@salesforce/apex/controladorGeneracionPedidos.generatePdfFiles'
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LightningAlert from 'lightning/alert';
import uploadFile from '@salesforce/apex/FilesController.uploadFile';

import checkGeneracionDePedido from '@salesforce/apex/UserContactClass.checkGeneracionDePedido';

export default class UnidadMedicaView extends LightningElement {

    @wire(MessageContext)
    messageContext;
    isUnidadMedica = false;
    error;
    unidadMedica = {};

    accountSelected = '';
    umuData = [];
    carrito = {};
    isPedidos = false;
    isUltimaVentantaOrdinario = false;
    userId;

    clavePresupuestal;
    tipoUmu;
    name;
    umu;
    @api
    tipoDePedido = '';
    numeroOficio = '';
    justificacion = '';
    delegacion;

    fileData = {};
    fileName = '';

    susbcribeToMessageChannel(){
        subscribe(
            this.messageContext,
            SET_GENERAR_PEDIDOS_MENU,
            (message) => this.handleMessage(message)
        );
    }

    handleMessage(message){
        if(message.isSolicitarPedidos){
            this.isUnidadMedica = true;
            this.isPedidos = false;
        }else if(message.isPedidos){
            this.isUnidadMedica = true;
            this.isPedidos = this.tipoDePedido !== 'Ordinario';
            this.isUltimaVentantaOrdinario = this.tipoDePedido === 'Ordinario';
        }else{
            this.isUnidadMedica = false;
            this.isPedidos = false; 
        }
    }

    connectedCallback(){
        this.susbcribeToMessageChannel();
        this.susbcribeToMessageChannelUmu();
        this.susbcribeToMessageChannelCarrito();
    }

    handlePedidoNoOrdinario(){
        this.tipoDePedido = 'No Ordinario';
        this.dispatchEvent(new CustomEvent('nordinario'));
    }

    handlePedidoEspeciales(){
        this.tipoDePedido = 'Especiales';
        this.dispatchEvent(new CustomEvent('especiales'));
    }

    handlePedidoOrdinario(){
        this.tipoDePedido = 'Ordinario';
        this.dispatchEvent(new CustomEvent('ordinario', {
            detail: this.tipoDePedido
        }));
    }

    handleUmuData(event){
        this.umuData = event.detail;
    }

    handleMessageUmu(message){

        console.log("Inside handle message umu");
        console.log(JSON.parse(JSON.stringify(message.selectedUmu)));

        if(message.selectedUmu === 'Seleccionar Unidad Medica'){
            this.accountSelected = null;
        } else{
            this.unidadMedica = this.umuData.filter(item => message.selectedUmu.includes(item.Id));
            this.unidadMedica.forEach(item => {
                this.clavePresupuestal = item.Clave_Presupuestal__c;
                this.tipoUmu = item.Tipo_UMU__c;
                this.name = item.Name;
                this.umu = item.UMU__c;
                this.delegacion = item.Delegacion__c;
            });
        }

        // this.unidadMedica = this.umuData.filter(item => message.selectedUmu.includes(item.Id));
        // this.unidadMedica.forEach(item => {
        //     this.clavePresupuestal = item.Clave_Presupuestal__c;
        //     this.tipoUmu = item.Tipo_UMU__c;
        //     this.name = item.Name;
        //     this.umu = item.UMU__c;
        //     this.delegacion = item.Delegacion__c;
        // });
    }

    susbcribeToMessageChannelUmu(){
        subscribe(
            this.messageContext,
            umuRecordSelected,
            (message) => this.handleMessageUmu(message)
        );
    }

    handleSelectedAccountId(event){
        this.accountSelected = event.detail;
        console.log('Umu: ' + this.accountSelected);
    }

    handleUserId(event){
        this.userId = event.detail;
        console.log('Contact: ' + this.userId);
    }

    handleCreateOrdenData(message){
        let items = [];
        message.Carrito.forEach(element => {
            let item = {
                insumoId: element.Id,
                CantidadSolicitada: element.Cantidad
            };
            items.push(item);
        })

        this.carrito.Idcontacto = this.userId;
        this.carrito.IdUmu = this.accountSelected;
        this.carrito.TipoDePedido = this.tipoDePedido;
        this.carrito.ordenesDetails = items;      
        
        console.log('Tipo de pedido: ' + this.tipoDePedido);
    }

    susbcribeToMessageChannelCarrito(){
        subscribe(
            this.messageContext,
            getCarritoData,
            (message) => this.handleCreateOrdenData(message)
        );
    }

    handleOnChange(event){
        this.numeroOficio = event.target.value;
    }

    handleTextAreaChange(event){
        this.justificacion = event.target.value;
    }

    acceptedFormats(){
        return ['.pdf'];
    }

    isObjEmpty (obj) {
        return Object.keys(obj).length === 0;
    }

    async handleGuardar(){

        console.log("Inside handle guardar");
        console.log(this.numeroOficio);
        console.log(this.tipoDePedido);

        const button = this.tipoDePedido == 'Ordinario' ? this.template.querySelector('.guardar-btn-ordinario') :  this.template.querySelector('.guardar-btn');
        button.disabled = true;

        if(this.isObjEmpty(this.carrito)){
            button.disabled = false;
            LightningAlert.open({
                message: 'Debes tener un insumo añadido.',
                theme: 'error',
                label: 'Error!',
            });
            return;
        }

        if(this.tipoDePedido != 'Ordinario' && (this.numeroOficio == null || this.numeroOficio == '' )){
            button.disabled = false;
            LightningAlert.open({
                message: 'Debes rellenar el campo Número de Oficio',
                theme: 'error',
                label: 'Error!',
            });
            return;
        }

        console.log(JSON.parse(JSON.stringify(this.carrito)));

        let isNoOrdinario = this.tipoDePedido != 'No Ordinario' ? true: false;
        this.carrito.TipoDePedido = this.tipoDePedido;
        this.carrito.numeroOficio = this.numeroOficio;
        this.carrito.justificacion = this.justificacion;

        if(isNoOrdinario || this.tipoDePedido == 'Ordinario'){ 

            const order = await crearOrden({payload: JSON.stringify([this.carrito])}).then(result =>{
                return result;
            }).catch(error =>{
                console.log('An error has occured: ' + error.getMessage());
            });

            const orderIds = [];
            order.forEach((ord) => {
                orderIds.push(ord.Id);
            });

            generarPdf({orderIds: orderIds}).then(result => {
                console.log('Se ha generado exitosamente: ');
                console.log(JSON.parse(JSON.stringify(result)));
            }).catch(error =>{
                console.log('An error has occured: ' + error.getMessage());
            });

            if(!this.isObjEmpty(this.fileData)){
                this.fileData.recordId = order[0].Id;
                const {filename, base64, recordId} = this.fileData;
                await uploadFile({base64: base64, filename: filename, recordId: recordId});
            }

            if(this.tipoDePedido == 'Ordinario'){
                console.log('Inside pedido ordinario');
                const isCreated = await this.handleGeneracionDePedido(order);
                console.log(isCreated);
                if(!isCreated){ return;}
            }

            this.showToast('Success', 'Orden ha sido creada.', 'Success', 'pester');
            
            setTimeout(() => {
                location.reload();
            }, 1500);

        }else{
            let isTipoDePedido = this.tipoDePedido == 'No Ordinario' ? '- Debes seleccionar un tipo de pedido.': ''; 
            button.disabled = false;
            LightningAlert.open({
                message: isTipoDePedido,
                theme: 'error',
                label: 'Error!',
            });
        }

    }

    async handleGeneracionDePedido(orden) {  
        const orderIds = orden.map(ord => ord.Id); 
        try {
            const result = await checkGeneracionDePedido({ orderIdList: orderIds });
            const parsedResult = JSON.parse(result);
            const { traxion_response = {} } = parsedResult;
            const { completed_succesfully = false } = traxion_response;
            return completed_succesfully;
        } catch (error) {
            console.log('An error has occurred: ' + error.message());
            return false;
        }
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

    handleUploadFinished(event){
        if(event.target.files.length > 0) {
            const file = event.target.files[0];
            var reader = new FileReader();
            reader.onload = () => {
                var base64 = reader.result.split(',')[1]
                this.fileName = file.name;
                this.fileData = {
                    'filename': file.name,
                    'base64': base64
                }
            }
            reader.readAsDataURL(file);
        }
    }

    // get ordenAMostrar(){
    //     console.log("INSIDE GET TIPO DE PEDIDO");
    //     console.log(this.tipoDePedido); 

    //     if(this.tipoDePedido = 'Ordinario'){
    //         return 'slds-hide'; 
    //     } else {
    //         return 'slds-show';
    //     }
    // }

}