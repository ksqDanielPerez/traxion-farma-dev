import { LightningElement, track, wire, api } from 'lwc';
import modalDetail from 'c/programSupplieDetailModal';
import modalConfirmation from 'c/programConfirmationModal';
import { getRecord, getFieldValue } from "lightning/uiRecordApi"
import getSuppliesBySearch from '@salesforce/apex/SuppliesController.getSuppliesBySearch';
import getProgramsByContact from '@salesforce/apex/ProgramController.getProgramsByContact';
import getUmusById from '@salesforce/apex/UmuController.getUmusById';
import getAvailabilitySkus from '@salesforce/apex/UserContactClass.getDisponibilidadSkus';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import USER_ID from "@salesforce/user/Id";
import createOrders from '@salesforce/apex/controladorGeneracionPedidos.deserializeOrders';
import generatePDF from '@salesforce/apex/controladorGeneracionPedidos.generatePdfFiles';
import { NavigationMixin } from 'lightning/navigation';

export default class ProgramSuppliesList extends NavigationMixin(LightningElement) {
  @api selectedStep;
  @api umusSelected;
  @api orderType;
  @api maxDate;

  searchTerm = '';
  rendered = false;
  isStep3 = false;
  addSuppliesBtn;
  emptyInput = false;
  isInputValidate = true;
  isProgramPicklistEmpty = true;

  @track data;
  @track listRecords;
  @track quantity = 0;
  @track dataOfUmusSelected;
  @track addSuppliesText = "Insumos seleccionados (" + this.quantity + ")";

  @track options = [];
  @track isProgramsDataLoaded = false;
  @track programId;
  @track isDataLoaded = false;
  @track isDataSkuLoaded = false;
  @track isUmusSelectedDataLoaded = false;
  @track skuData = [];
  @track carrito;

  @track error = null;
  @track initialRecords = [];
  @track totalRecords = 0;
  @track isFirstTime = true;
  dataToDownload = [];
  currentPage = 1; 
  actualRecords = 0;
  totalPages = 0; 
  displayedItems = []; 
  isFirstPage = true; 
  isLastPage = false;
  pageSize = 10;

  columnHeader = ['PROGRAMA', 'DELEGACION', 'CLAVE PRESUPUESTAL', 'NOMBRE UMU',
  'CLAVE DE INSUMO', 'NOMBRE DE PRODUCTO', 'EXISTENCIA EN UMU', 'CANTIDAD A ENVIAR'];

  connectedCallback() {
    this.getPrograms();
    if(this.selectedStep == "Step3") {
      this.isStep3 = true;
      this.getUmuInfoById();
    } else {
      sessionStorage.clear();
    }
    this.getSupplies3();
  }

  renderedCallback() {
    if(this.rendered == false) {
      this.addSuppliesBtn = this.template.querySelector('lightning-button[data-name="addSuppliesBtn"]');
      if(this.isStep3) {
        this.template.querySelector('div[data-name="unavailable-data-text"]').style.visibility = 'hidden';
      }
      this.rendered = true;
    }
  }

  @wire(getRecord, { recordId: USER_ID, fields: [CONTACT_ID] })
  user;

  get contactId() {
    return getFieldValue(this.user.data, CONTACT_ID);
  }

  handleCreateOrderBtn(event) {
    const quantityInputs = this.template.querySelectorAll('lightning-input[data-name="quantityInput"]');

    if(!this.isInputValidate) {
      this.showToast('Error', 'No se pudieron agregar las piezas, hay cantidades invalidas', 'error', 'pester');
    } else{
      for(let input of quantityInputs) {
        if(input.value == '' || input.value == 0) {
          this.showToast('Error', 'No se pueden guardar cantidades vacias', 'error', 'pester');
          this.emptyInput = true;
          break;
        } else {
          this.emptyInput = false;
        }
      }
      if(!this.emptyInput) this.generateCar();
    }
  }

  async openConfirmationModal(carrito) {
    const result = await modalConfirmation.open({
      size: 'small',
      carrito: carrito
    });
    console.log(result);
  }

  // generateCar() {
  //   this.carrito = [];
  //   this.umusSelected.forEach((row => {
  //     let dataLine = {};
  //     dataLine.Idcontacto = this.contactId;
  //     dataLine.IdUmu = row;
  //     dataLine.TipoDePedido = this.orderType;
  //     dataLine.esPrograma = true;
  //     if(this.maxDate) dataLine.fechaMaxima = this.maxDate;

  //     let input = this.template.querySelectorAll('lightning-input[data-umu="' + row + '"]');
      
  //     let products = [];
  //     input.forEach((input => {
  //       let dataProduct = {};
  //       dataProduct.insumoId = input.dataset.id;
  //       dataProduct.CantidadSolicitada = input.value;
  //       products.push(dataProduct);
  //     }))
  //     dataLine.ordenesDetails = products;

  //     this.carrito ? this.carrito = [...this.carrito, dataLine] : this.carrito = [dataLine];
  //   }))

  //   console.log(JSON.stringify(this.carrito));
  //   createOrders({ payload: JSON.stringify(this.carrito)})
  //   .then((result) => {
  //     if(result) {
  //       console.log('Pedido: ');
  //       console.log(JSON.stringify(result));

  //       result.forEach((order => {
  //         generatePDF({idOrden: order.Id}).then(result =>{
  //           console.log('Se ha generado exitosamente: ' + result);
  //         }).catch(error =>{
  //           console.log('An error has occured: ' + error.getMessage());
  //         })
  //       }))

  //       this.showToast('Guardado', 'El pedido se ha guardado correctamente', 'success', 'pester');

  //       this[NavigationMixin.Navigate]({
  //         type: 'comm__namedPage',
  //         attributes:{
  //           name: "Mis_Pedidos__c"
  //         }
  //       });
  //     }
  //   })
  //   .catch((error) => {
  //     this.error = error;
  //     console.log(JSON.stringify(error));
  //   });
  // }

  generateCar() {
    this.carrito = [];
    this.umusSelected.forEach((row => {
      let dataLine = {};
      dataLine.Idcontacto = this.contactId;
      dataLine.IdUmu = row;
      dataLine.TipoDePedido = this.orderType;
      dataLine.esPrograma = true;
      if(this.maxDate) dataLine.fechaMaxima = this.maxDate;

      let input = this.template.querySelectorAll('lightning-input[data-umu="' + row + '"]');
      
      let products = [];
      input.forEach((input => {
        let dataProduct = {};
        dataProduct.insumoId = input.dataset.id;
        dataProduct.CantidadSolicitada = input.value;
        products.push(dataProduct);
      }))
      dataLine.ordenesDetails = products;

      this.carrito ? this.carrito = [...this.carrito, dataLine] : this.carrito = [dataLine];
    }))

    console.log(JSON.stringify(this.carrito));


    //this.openConfirmationModal(this.carrito);
    this.createAndGeneratePDF();
  }

  async createAndGeneratePDF() {
    try {
      let orders = await createOrders({ payload: JSON.stringify(this.carrito) });
      console.log('Pedido: ');
      console.log(JSON.stringify(orders));
  
      for (let order of orders) {
        let result = await generatePDF({idOrden: order.Id});
        console.log('Se ha generado exitosamente: ' + result);
      }
  
      this.showToast('Guardado', 'El pedido se ha guardado correctamente', 'success', 'pester');
  
      this[NavigationMixin.Navigate]({
        type: 'comm__namedPage',
        attributes:{
          name: "Mis_Pedidos__c"
        }
      });
    } catch (error) {
      this.error = error;
      console.log(JSON.stringify(error));
    }
  }

  generateDataToDownload() {
    let dataList = [];
    this.dataOfUmusSelected.forEach((umu => {
      let input = this.template.querySelectorAll('lightning-input[data-umu="' + umu.id + '"]');
      input.forEach((input => {
        let dataLine = {};
        dataLine.Programa = this.orderType;
        dataLine.Delegacion = umu.delegation;
        dataLine.Clave_Presupuestal = umu.budget;
        dataLine.Nombre_UMU = umu.name;
        dataLine.Clave_De_Insumo = input.dataset.id;
        dataLine.Producto = input.dataset.productname;
        dataLine.Existencia_Umu = input.dataset.capacity;
        if(input.value) {
          dataLine.Cantidad_A_Enviar = input.value;;
        } else {
          dataLine.Cantidad_A_Enviar = 0;
        }
        dataList.push(dataLine);
      }));
    }));
    this.dataToDownload = dataList;
    this.downloadCSVFile();
  }

  downloadCSVFile(){
    let doc;
    this.columnHeader.forEach(element => {
      if(doc) {
        doc += element + ',';
      } else {
        doc = element + ',';
      }
    });
    this.dataToDownload.forEach(record => {
      doc += '\n';
      doc += record.Programa + ','; 
      doc += record.Delegacion + ','; 
      doc += record.Clave_Presupuestal + ',';
      doc += record.Nombre_UMU + ',';
      doc += record.Clave_De_Insumo + ',';
      doc += record.Producto + ',';
      doc += record.Existencia_Umu + ',';
      doc += record.Cantidad_A_Enviar + ',';
    });
    let downloadElement = document.createElement('a');
    downloadElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(doc);
    downloadElement.target = '_self';
    downloadElement.download = 'Documento Base.csv';
    document.body.appendChild(downloadElement);
    downloadElement.click();
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

  getUmuInfoById() {
    getUmusById({ umuIds: this.umusSelected })
    .then((result) => {
      if(result) {
        let supplieList = [];
        result.forEach((row) => {
          let dataLine = {};
          dataLine.id = row.Id;
          dataLine.name = row.Name;
          dataLine.delegation = row.Delegaci_n__c;
          dataLine.budget = row.Clave_Presupuestal__c;
          dataLine.number = row.UMU__c;
          supplieList.push(dataLine);
        })
        this.dataOfUmusSelected = supplieList;
        this.isUmusSelectedDataLoaded = true;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  getPrograms() {
    getProgramsByContact()
    .then((result) => {
      if(result) {
        let optionList = [];
        result.forEach((row) => {
          let dataLine = {};
          dataLine.value = row.Id;
          dataLine.label = row.Name;
          optionList.push(dataLine);
        })
        this.options = optionList;
        this.isProgramsDataLoaded = true;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
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

  getSupplies3() {
    if(this.isStep3) this.programId = sessionStorage.getItem(0);

    getSuppliesBySearch({ search: this.searchTerm, programId: this.programId})
    .then((result) => {
      if(result) {
        if(this.isStep3) {
          for(let i = 1; i < sessionStorage.length; i++) {
            if (this.listRecords) {
              this.listRecords = [...this.listRecords, sessionStorage.getItem(i)];
            } else {
              this.listRecords = [sessionStorage.getItem(i)];
            }
          }
          console.log('Lista: ' + JSON.stringify(this.listRecords));
          this.getAvailabilitySkus();
        }

        let supplieList = [];

        result.forEach((row) => {
          let dataLine = {};
          dataLine.id = row.Id;
          dataLine.productCodeId = row.Product_Code_ID__c;
          dataLine.name = row.Name;
          dataLine.packageCapacity = row.Package_Capacity__c;
          dataLine.showButton = true;

          if(this.isStep3) {
            if(this.skuData) {
              this.skuData.forEach((sku) => {
                if(sku.sku == row.Product_Code_ID__c && sku.quantity_pieces_package) {
                  dataLine.quantityPiecesPackage = this.skuData.quantity_pieces_package;
                }
              })
            }
            if(this.listRecords.findIndex(object => object === dataLine.productCodeId) != -1) {
              supplieList.push(dataLine);
            }
          }
          else {
            supplieList.push(dataLine);
          }
        })
        this.data = supplieList;
        this.initialRecords = supplieList;

        if(this.programId != undefined && !this.isStep3) this.isDataLoaded = true;

        this.totalPages = Math.ceil(this.data.length / this.pageSize);
        this.totalRecords = this.data.length;
        this.updateDisplayedItems();
      } else {
        this.isDataLoaded = false;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  updateDisplayedItems() {
    const startIndex = (this.currentPage - 1) * this.pageSize; 
    const endIndex = this.currentPage * this.pageSize;
    this.displayedItems = this.data.slice(startIndex, endIndex);
    this.isFirstPage = this.currentPage === 1;
    this.isLastPage = this.currentPage === this.totalPages;

    if(this.isFirstTime) {
      if(this.programId) {
        this.actualRecords += this.displayedItems.length;
        this.isFirstTime = false;
      }
    }
  }

  getAvailabilitySkus() {
    // getAvailabilitySkus({ jsonData: JSON.stringify(this.listRecords) })
    // .then((result) => {
    //   console.log(JSON.parse(result));
    //   this.skuData = JSON.parse(result);
    //   this.isDataSkuLoaded = true;
    // })
    // .catch((error) => {
    //   this.error = error;
    //   console.log(JSON.stringify(error));
    // })
    this.isDataSkuLoaded = true;
  }

  handleChangeQuantity(event) {
    const productCode = event.target.dataset.code;
    const umuId = event.target.dataset.umu;
    const quantityInput = this.template.querySelector('lightning-input[data-code="' + productCode + '"][data-umu="' + umuId + '"]');

    var sku = this.data.find(key => key.productCodeId == productCode);
    console.log('SKU: ' + JSON.stringify(sku));

    this.validateInput(quantityInput, sku);
  }

  validateInput(element, sku){
    var errorMessage = '';
    var isMultiplo = 0;

    if(sku.quantityPiecesPackage != undefined) isMultiplo = this.validateMultiplo(sku.quantityPiecesPackage, element.value);

    if(element.value > 10000){
      errorMessage = "Cantidad insuficiente en CENADI";
      element.setCustomValidity(errorMessage);
      this.isInputValidate = false;
    } else if(!isMultiplo && sku.quantityPiecesPackage != undefined){
      errorMessage = `Ingrese múltiplos de ${sku.quantityPiecesPackage}`;
      element.setCustomValidity(errorMessage);
      this.isInputValidate = false;
    } else{
      element.setCustomValidity("");
      this.isInputValidate = true;
    }
    element.reportValidity();
  }

  validateMultiplo(multiplo, value) {
    const even = (element) => value % element === 0;
    return multiplo.some(even);
  }

  handleChange(event) {
    this.programId = event.detail.value;
    this.isDataLoading = true;
    this.isDataLoaded = false;
    this.isProgramPicklistEmpty = false;
    this.actualRecords = 0;
    this.isFirstTime = true;
    this.listRecords = [];
    this.calcQuantity();
    this.getSupplies3();
  }

  handleClickAddBtn(event) {
    sessionStorage.setItem(0, this.programId);

    for(let i = 0; i < this.listRecords.length; i++) {
      sessionStorage.setItem(i+1, this.listRecords[i]);
    }
    // console.log(JSON.stringify(sessionStorage));
    this.selectedStep = 'Step2';
    const indicatorEvent = new CustomEvent('getindicatorposition', {
      detail: this.selectedStep
    });
    this.dispatchEvent(indicatorEvent);
  }

  handleKeyChange(event) {
    const searchKey = event.target.value.toLowerCase();
    if(searchKey) {
      this.data = this.initialRecords;
      if (this.data) {
        let searchRecords = [];
        for (let record of this.data) {
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
        this.data = searchRecords;
        this.updateDisplayedItems();
      }
    } else {
      this.data = this.initialRecords;
      this.updateDisplayedItems();
    }
  }

  handleClick(event) {
    const productCode = event.target.dataset.code;
    const productName = event.target.dataset.name;

    const product = this.data.find(data => data.productCodeId === productCode);

    if(productName === "Detail") {
      console.log(event.target.dataset);
      this.openModal(productCode);
    } else if(productName === "Add") {
      
      product.showButton = false;
      this.listRecords ? this.listRecords = [...this.listRecords, productCode] : this.listRecords = [productCode];
      this.calcQuantity();

    } else if(productName === "Remove") {

      product.showButton = true;
      this.listRecords = this.listRecords.filter(value => value !== productCode);
      this.calcQuantity();
    }

    this.data = [...this.data];
  }

  calcQuantity() {
    if(this.listRecords.length) {
      this.quantity = this.listRecords.length;
      if(this.addSuppliesBtn.disabled == true) this.addSuppliesBtn.disabled = false;
    } else {
      this.quantity = 0;
      if(this.addSuppliesBtn.disabled == false) this.addSuppliesBtn.disabled = true;
    }
    this.addSuppliesText = "Insumos seleccionados (" + this.quantity + ")";
  }

  async openModal(productCode) {
    const result = await modalDetail.open({
        size: 'small',
        productCode: productCode,
    });
    console.log(result);
  }
}