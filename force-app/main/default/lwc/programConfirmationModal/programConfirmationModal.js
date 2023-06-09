import { LightningElement, api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import createOrders from '@salesforce/apex/controladorGeneracionPedidos.deserializeOrders';
import generatePDF from '@salesforce/apex/controladorGeneracionPedidos.generatePdfFiles';
import createContentVersion from '@salesforce/apex/controladorGeneracionPedidos.createContentVersion';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

import uploadFile from '@salesforce/apex/FilesController.uploadFile';
import checkGeneracionDePedido from '@salesforce/apex/UserContactClass.checkGeneracionDePedido';
import createOrder from '@salesforce/apex/controladorGeneracionPedidos.deserializeOrders';

export default class ProgramConfirmationModal extends NavigationMixin(LightningModal) {
  @api carrito;
  @api umusSelected;
  @api inputs;
  @api program;
  @api extraData;

  @track content;

  dataToEmail = [];
  orderId;
  isDataLoading = false;

  connectedCallback() {
    console.log('carrito: ');
    console.log(JSON.stringify(this.carrito));
    console.log('umus: ');
    console.log(this.umusSelected);
    console.log(JSON.stringify(this.umusSelected));
    console.log('inputs: ');
    console.log(JSON.stringify(this.inputs));
    console.log('programs: ');
    console.log(JSON.stringify(this.program));
    console.log('extraData: ');
    console.log(JSON.stringify(this.extraData));
    if(this.carrito.lenght > 1) {
      this.content = 'varios pedidos'
    } else {
      this.content = 'un pedido'
    }
  }

  handleSave() {
    if(this.extraData.orderType == 'Ordinario/NoOrdinario') {
      this.handleOrderSave();
    } else {
      this.handleOrdersSave();
    }
  }

  // GENERACION PEDIDOS

  async handleOrderSave() {
    this.isDataLoading = true;

    const order = await createOrder({payload: JSON.stringify([this.carrito])}).then(result => {
      console.log('Order created successfully');
      return result;
    }).catch(error =>{
      console.log('An error has occured: ' + error.getMessage());
    });

    const orderIds = [];
    order.forEach((ord) => {
      orderIds.push(ord.Id);
    });

    console.log('before generate PDF');

    generatePDF({orderIds: orderIds}).then(result => {
      console.log('Se ha generado exitosamente: ');
      console.log(JSON.parse(JSON.stringify(result)));
    }).catch(error =>{
      console.log('An error has occured: ' + error.getMessage());
    });

    console.log('after generate PDF');

    if(Object.keys(this.extraData.fileData).length !== 0){
      console.log('hi hi');
      console.log(order[0]);
      const recordId = order[0].Id;

      let fileData = this.extraData.fileData;
      console.log('file: ' + JSON.stringify(fileData));
      await uploadFile({base64: fileData.base64, filename: fileData.filename, recordId: recordId});
    }

    if(this.carrito.TipoDePedido == 'Ordinario'){
      console.log('Inside pedido ordinario');
      // const isCreated = await this.handleGeneracionDePedido(order);
      // console.log(isCreated);
      //if(!isCreated) return;
    }

    console.log('before handle generacion pedidos');

    this.showToast('Orden creada', 'La orden ha sido creada exitosamente', 'success', 'pester');

    this[NavigationMixin.Navigate]({
      type: 'comm__namedPage',
      attributes:{
        name: "Mis_Pedidos__c"
      }
    });

    this.close('done');
  }

  async handleGeneracionDePedido(orden) {
    console.log('init handle generacion de pedido: ');
    const orderIds = orden.map(ord => ord.Id);
    try {
        const result = await checkGeneracionDePedido({ orderIdList: orderIds });
        console.log('result: ' + result);
        const parsedResult = JSON.parse(result);
        const { traxion_response = {} } = parsedResult;
        const { completed_succesfully = false } = traxion_response;
        return completed_succesfully;
    } catch (error) {
      console.log('An error has occurred: ' + error.message());
      return false;
    }
  }

  // PROGRAMAS

  handleOrdersSave() {
    this.isDataLoading = true;

    createOrders({ payload: JSON.stringify(this.carrito)})
    .then((result) => {
      if(result) {
        console.log('Pedido: ');
        console.log(JSON.stringify(result));

        const orderIds = [];

        result.forEach((order) => {
          orderIds.push(order.Id);
        });

        generatePDF({orderIds: orderIds}).then(result => {
          console.log('Se ha generado exitosamente: ');
          console.log(JSON.parse(JSON.stringify(result)));
        }).catch(error =>{
          console.log('An error has occured: ' + error.getMessage());
        });

        console.log('OrderId');
        this.orderId = result[0].Id;
        console.log(this.orderId);

        this.generateDataToSendEmail();

        this.showToast('Guia creada', 'La guia se ha creado exitosamente', 'success', 'pester');

        this[NavigationMixin.Navigate]({
          type: 'comm__namedPage',
          attributes:{
            name: "Mis_Pedidos__c"
          }
        });

        this.close('done');
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    });
  }

  generateDataToSendEmail() {
    let dataList = [];
    this.umusSelected.forEach((umu => {
      let filteredInputs = this.inputs.filter((input) => input.umu === umu.id);
      filteredInputs.forEach((input => {
        let dataLine = {};
        dataLine.delegacion = umu.delegation;
        dataLine.umu = umu.number;
        dataLine.clavePresupuestal = umu.budget;
        dataLine.nombreUmu = umu.name;
        dataLine.tipoPedido = this.extraData.orderType;
        dataLine.fechaSolicitud = new Date().toISOString().slice(0, 10);
        dataLine.claveInsumo = input.code;
        dataLine.producto = input.productName;
        dataLine.descripcion = input.description;
        dataLine.cantidadAutorizada = input.value;
        dataLine.cantidadSap = input.value;
        dataLine.estatus = 'AUTORIZADO'
        dataLine.programaId = this.program.programCode;
        dataLine.programaNombre = this.program.programName;
        dataList.push(dataLine);
      }));
    }));
    this.dataToEmail = dataList;
    this.generateCSVContent();
  }

  columnHeaderEmail = ['DELEGACION', 'UMU', 'CLAVE PRESUPUESTAL', 'NOMBRE UMU', 'TIPO DE PEDIDO',
  'FECHA DE SOLICITUD', 'CLAVE', 'INSUMO', 'DESCRIPCION', 'CANTIDAD AUTORIZADA', 'CANTIDAD COLOCADA EN SAP',
  'ESTATUS', 'ID DE PROGRAMA', 'PROGRAMA'];

  generateCSVContent() {
      let csvContent = this.columnHeaderEmail.join(',') + '\n';
      this.dataToEmail.forEach(record => {
        csvContent += record.delegacion + ',' + record.umu + ',' + record.clavePresupuestal + ',' +
        record.nombreUmu + ',' + record.tipoPedido + ',' + record.fechaSolicitud + ',' + record.claveInsumo + ',' +
        record.producto + ',' + record.descripcion + ',' + record.cantidadAutorizada + ',' + record.cantidadSap + ','
        + record.estatus + ',' + record.programaId + ',' + record.programaNombre + '\n';
      });
      this.sendCSVEmail(csvContent);
  }

  sendCSVEmail(content) {
    let csvContent = content;
    let csvData = csvContent;

    let contentVersion = {
      Title: 'Documento General.csv',
      VersionData: btoa(csvData),
      PathOnClient: 'DocumentoGeneral.csv',
    };

    const uniqueClavePresupuestal = new Set(this.dataToEmail.map(item => item.clavePresupuestal));
    const sumCantidadAutorizada = this.dataToEmail.reduce((total, item) => total + parseFloat(item.cantidadAutorizada), 0); // Sumatoria de cantidadAutorizada
    const dataSummary = {
      numItems: this.dataToEmail.length,
      numCantidadUmus: uniqueClavePresupuestal.size,
      sumCantidadAutorizada: sumCantidadAutorizada
    };

    const programName = this.program.programName;
    const summaryJson = JSON.stringify(dataSummary);

    console.log('ContentVersion');
    console.log(JSON.stringify(contentVersion));
    console.log(summaryJson);
    console.log(programName);

    createContentVersion({ title: contentVersion.Title, versionData: contentVersion.VersionData, pathOnClient: contentVersion.PathOnClient,
      contactId: this.extraData.contactId, orderId: this.orderId, programName: programName, summaryJson: summaryJson})
    .then(result => {
      console.log('Operacion exitosa creando el ContentVersion: ');
      console.log(result);
    })
    .catch(error => {
      console.log('An error has occurred while creating the ContentVersion: ');
      console.log(error);
    });
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

  handleClose() {
    this.close('done');
  }
}