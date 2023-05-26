import { LightningElement, track, wire, api } from 'lwc';
import modalDetail from 'c/programSupplieDetailModal';
import modalConfirmation from 'c/programConfirmationModal';
import { getRecord, getFieldValue } from "lightning/uiRecordApi"
import getSuppliesBySearch from '@salesforce/apex/SuppliesController.getSuppliesBySearch';
import getProgramsByContact from '@salesforce/apex/ProgramController.getProgramsByContact';
import getProgramById from '@salesforce/apex/ProgramController.getProgramById';
import getUmusById from '@salesforce/apex/UmuController.getUmusById';
import getAvailabilitySkus from '@salesforce/apex/UserContactClass.getDisponibilidadSkus';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import CONTACT_ID from "@salesforce/schema/User.ContactId";
import USER_ID from "@salesforce/user/Id";
import createOrders from '@salesforce/apex/controladorGeneracionPedidos.deserializeOrders';
import generatePDF from '@salesforce/apex/controladorGeneracionPedidos.generatePdfFiles';
import createContentVersion from '@salesforce/apex/controladorGeneracionPedidos.createContentVersion';
import getSubalmacenById from '@salesforce/apex/SubalmacenController.getSubalmacenById';
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

  @track importData;
  @track columns;

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

  // Datatable to CSV

  generateDataToDownload() {
    let dataList = [];
    this.dataOfUmusSelected.forEach((umu => {
      let input = this.template.querySelectorAll('lightning-input[data-umu="' + umu.id + '"]');
      input.forEach((input => {
        let dataLine = {};
        dataLine.Programa = this.orderType;
        dataLine.Delegacion = umu.delegation;
        dataLine.Clave_Presupuestal = umu.budget.toString();
        dataLine.Nombre_UMU = umu.name;
        dataLine.Clave_De_Insumo = input.dataset.id;
        dataLine.Producto = input.dataset.productname;
        dataLine.Existencia_Umu = input.dataset.capacity;
        if(input.value) {
          dataLine.Cantidad_A_Enviar = input.value;
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
      doc += "'" + record.Clave_Presupuestal.toString() + ',';
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

  // CSV to Datatable

  handleFileUpload(event) {
    const files = event.detail.files;
    if (files.length > 0) {
      const file = files[0];
      this.read(file); // start reading the uploaded csv file
    }
  }

  async read(file) {
    try {
      const result = await this.load(file);
      this.parse(result); // execute the logic for parsing the uploaded csv file
    } catch (e) {
      console.log(e);
      this.error = e;
    }
  }

  async load(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
          resolve(reader.result);
      };
      reader.onerror = () => {
          reject(reader.error);
      };
      reader.readAsText(file);
    });
  }

  parse(csv) {
    const self = this;

    const lines = csv.split(/\r\n|\n/); // parse the csv file and treat each line as one item of an array
    const headers = lines[0].split(','); // parse the first line containing the csv column headers

    if (headers[headers.length-1].trim() === '"') headers.pop();

    // iterate through csv headers and transform them to column format supported by the datatable
    this.columns = headers.map((header) => {
        return { label: header, fieldName: header};
    });

    const importData = [];

    // iterate through csv file rows and transform them to format supported by the datatable
    lines.forEach((line, i) => {
      if (i === 0) return;
      const obj = {};
      let currentline = line.split(',');
      const parsedLine = currentline.map(li => li.replace(/"/g, ""));
      for (let j = 0; j < headers.length; j++) {
        const formattedKey = headers[j].toLowerCase().replace(/\s+/g, '');
        obj[formattedKey] = parsedLine[j];
      }
      importData.push(obj);
    });

    // assign the converted csv data for the lightning datatable
    this.importData = importData;
    const selectedUmus = this.dataOfUmusSelected;

    const filteredData = importData.filter(rec => {
      const { clavepresupuestal, programa } = rec;
      if (programa === "") {
        return false;
      }
      if (clavepresupuestal) {
        for (const umu of selectedUmus) {
          if (umu.budget && clavepresupuestal.substring(1).trim() === umu.budget) {
            return true;
          }
        }
        return false;
      }
      return true;
    });

    filteredData.forEach(function(data){
      const {clavepresupuestal = null} = data;
      if(clavepresupuestal){
        const quantityInput = self.template.querySelector('lightning-input[data-id="' + data.clavedeinsumo + '"][data-clavepresupuestal="' + data.clavepresupuestal.substring(1).trim()  + '"]');
        quantityInput.value = data.cantidadaenviar;
        console.log("Printing cantidad");
        console.log(JSON.parse(JSON.stringify(quantityInput)));
      }
    });

    const quantityInputs = this.template.querySelectorAll('lightning-input[data-name="quantityInput"]');
    quantityInputs.forEach((input) => {
      this.handleChangeQuantity({ target: input });
    })
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

  // Get Information

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
        this.options = result.map((row) => ({ value: row.Id, label: row.Name }));
        this.isProgramsDataLoaded = true;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  programInfo = {};

  getProgramById() {
    getProgramById({ programId: this.programId })
    .then((result) => {
      if(result) {
        this.programInfo = { programCode: result.Programa_ID__c, programName: result.Name };
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  async getSupplies3() {
    if (this.isStep3) {
      this.programId = sessionStorage.getItem(0);
      this.getProgramById();
    }

    try {
      const result = await getSuppliesBySearch({ search: this.searchTerm, programId: this.programId });

      if (result) {
        let supplieList = [];
        const skuDataDict = {};

        if (this.isStep3) {
          this.listRecords = Array.from({ length: sessionStorage.length - 1 }, (_, i) => sessionStorage.getItem(i + 1));
          console.log('Lista: ' + JSON.stringify(this.listRecords));
          await this.getAvailabilitySkus(); // Esperar a que se resuelva getAvailabilitySkus() antes de continuar

          this.skuData?.forEach((sku) => {
            skuDataDict[sku.sku] = sku; // sku.sku es la clave y se le asigna todo el objeto
          });
        }

        result.forEach(async (row) => {
          let dataLine = {};
          dataLine.id = row.Id;
          dataLine.productCodeId = row.Product_Code_ID__c;
          dataLine.name = row.Name;
          dataLine.packageCapacity = row.Package_Capacity__c;
          dataLine.description = row.Description__c;
          //dataLine.subalmacenId = row.Subalmacen__c != null ?  await this.getSubalmacenById(row.Subalmacen__c) :  0;
          dataLine.showButton = true;

          if (this.isStep3) {
            if(this.skuData.length > 0) {
              console.log('SkuData:' + JSON.stringify(this.skuData));
              const sku = skuDataDict[row.Product_Code_ID__c]; // se filtra por la clave y si existe se le asigna el objeto

              if (sku) {
                console.log('inside if sku, condition true');
                dataLine.availability = sku.availability ? sku.availability : 0;
                if(sku.packages_details.length > 0) {
                  dataLine.quantityPiecesPackage = sku.packages_details.map(piece => piece.quantity_pieces_package).join(", ");
                }
              }
            }

            if (this.listRecords.includes(dataLine.productCodeId)) {
              supplieList.push(dataLine);
              console.log('dataline1: ' + JSON.stringify(dataLine));
            }
          } else {
            supplieList.push(dataLine);
          }
        });

        this.data = supplieList;
        this.initialRecords = supplieList;

        if (this.programId != undefined && !this.isStep3) this.isDataLoaded = true;

        this.totalPages = Math.ceil(this.data.length / this.pageSize);
        this.totalRecords = this.data.length;
        this.updateDisplayedItems();
      } else {
        this.isDataLoaded = false;
      }
    } catch (error) {
      this.error = error;
      console.log(JSON.stringify(error));
    }
  }

  getAvailabilitySkus() {
    return new Promise((resolve, reject) => {
      getAvailabilitySkus({ jsonData: JSON.stringify(this.listRecords) })
        .then((result) => {
          console.log('SKU RESPONSE: ');
          console.log(JSON.parse(result));
          this.skuData = JSON.parse(result);
          this.isDataSkuLoaded = true;
          resolve(); // Resuelve la promesa para indicar que se completó la obtención de los datos
        })
        .catch((error) => {
          this.error = error;
          console.log(JSON.stringify(error));
          reject(error); // Rechaza la promesa en caso de error
        });
    });
  }

  // productList = [];
  // async getSupplies3() {
  //   if (this.isStep3) {
  //     this.programId = sessionStorage.getItem(0);
  //     this.getProgramById();
  //   }

  //   try {
  //     const result = await getSuppliesBySearch({ search: this.searchTerm, programId: this.programId });

  //     if (result) {
  //       let supplieList = [];
  //       var productKeys = [];
  //       const skuDataDict = {};

  //       if (this.isStep3) {
  //         this.listRecords = Array.from({ length: sessionStorage.length - 1 }, (_, i) => sessionStorage.getItem(i + 1));
  //         console.log('Lista: ' + JSON.stringify(this.listRecords));
  //       }

  //       result.forEach(async (row) => {
  //         let dataLine = {};
  //         dataLine.id = row.Id;
  //         dataLine.productCodeId = row.Product_Code_ID__c;
  //         dataLine.name = row.Name;
  //         dataLine.description = row.Description__c;
  //         dataLine.showButton = true;

  //         if (this.isStep3) {

  //           if (this.listRecords.includes(dataLine.productCodeId)) {
  //             productKeys.push(row.Product_Code_ID__c);
  //             supplieList.push(dataLine);
  //             console.log('dataline1: ' + JSON.stringify(dataLine));
  //           }
  //         } else {
  //           productKeys.push(row.Product_Code_ID__c);
  //           supplieList.push(dataLine);
  //         }
  //       });
  //       this.data = supplieList;
  //       await this.getAvailabilitySkus(productKeys);
  //       this.initialRecords = this.data;

  //       if (this.programId != undefined && !this.isStep3) this.isDataLoaded = true;

  //       this.totalPages = Math.ceil(this.data.length / this.pageSize);
  //       this.totalRecords = this.data.length;
  //       this.updateDisplayedItems();
  //     } else {
  //       this.isDataLoaded = false;
  //     }
  //   } catch (error) {
  //     this.error = error;
  //     console.log(JSON.stringify(error));
  //   }
  // }

  // getAvailabilitySkus(productKeys) {
  //   console.log('product keys: ' + productKeys);
  //   console.log('product keys2: ' + JSON.stringify(productKeys));
  //   return new Promise((resolve, reject) => { // Return a promise
  //     getAvailabilitySkus({ jsonData: productKeys })
  //       .then((result) => {
  //         console.log('result');
  //         console.log(result);
  //         const skuData = JSON.parse(result);
  //         const dataCopy = this.data.slice();

  //         console.log('SkuData');
  //         console.log(JSON.parse(JSON.stringify(skuData)));
  //         console.log('dataCopy');
  //         console.log(JSON.parse(JSON.stringify(dataCopy)));
  //         skuData.forEach((sku) => {
  //           dataCopy.forEach((element) => {
  //             if (element.productCodeId == sku.sku) {
  //               element.packageCapacity = sku.availability;
  //             }
  //           });
  //         });
  //         this.data = dataCopy;
  //         resolve(this.data); // Resolve with the updated dataCopy array
  //       })
  //       .catch((error) => {
  //         reject(error); // Reject the promise with the error
  //       });
  //   });
  // }

  // getAvailabilitySkus(productKeys) {
  //   console.log('product keys: ' + productKeys);
  //   getAvailabilitySkus({jsonData: JSON.stringify(productKeys)})
  //   .then(result => {
  //     const skuData = JSON.parse(result);
  //     const dataCopy = this.data.slice();

  //     skuData.forEach(sku => {
  //       dataCopy.forEach(element => {
  //         console.log('element' + element);
  //         if(element.productCodeId == sku.sku) {
  //           element.packageCapacity = sku.availability;
  //         }
  //         console.log('element 2' + element);
  //       })
  //     });
  //     this.data = dataCopy;
  //   }).catch((error) => {
  //     this.error = error;
  //     console.log(JSON.stringify(error));
  //   });
  // }

  updateDisplayedItems() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = this.currentPage * this.pageSize;
    this.displayedItems = this.data.slice(startIndex, endIndex);
    this.isFirstPage = this.currentPage === 1;
    this.isLastPage = this.currentPage === this.totalPages;

    if(this.isFirstTime && this.programId) {
      this.actualRecords += this.displayedItems.length;
      this.isFirstTime = false;
    }
  }

  // Handle functionalities

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

  handleChangeQuantity(event) {
    const productCode = event.target.dataset.code;
    const umuId = event.target.dataset.umu;
    const quantityInput = this.template.querySelector('lightning-input[data-code="' + productCode + '"][data-umu="' + umuId + '"]');

    var sku = this.data.find(key => key.productCodeId == productCode);
    console.log('SKU: ' + JSON.stringify(sku));

    this.validateInput(quantityInput, sku);
  }

  validateMultiplo(multiplo, value) {
    console.log('multiplo' + multiplo);
    const arrayMultiplo = multiplo.split(",");
    console.log('array Multiplo' + arrayMultiplo)

    if (arrayMultiplo.length > 1) {
      console.log('multiple');
      return arrayMultiplo.some((element) => value % element === 0);
    } else {
      console.log('single');
      return value % arrayMultiplo[0] === 0;
    }
  }

  validateInput(element, sku){
    let errorMessage = '';
    let isMultiplo = false;

    if(sku.quantityPiecesPackage) isMultiplo = this.validateMultiplo(sku.quantityPiecesPackage, element.value);

    if(element.value <= 0){
      errorMessage = 'La cantidad mínima a ingresar es 1';
    } else if(element.value > sku.availability) {
      errorMessage = `La cantidad solicitada sobrepasa la disponibilidad del producto`;
    } else if(!isMultiplo && sku.quantityPiecesPackage != undefined){
      errorMessage = `Ingrese múltiplos de ${sku.quantityPiecesPackage}`;
    } else if(!Number.isInteger(Number(element.value))) {
      errorMessage = 'Ingrese números enteros, no decimales';
    }

    element.setCustomValidity(errorMessage);
    this.isInputValidate = (errorMessage === '');
    element.reportValidity();
  }

  handleChange(event) {
    this.programId = event.detail.value;
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

    this.listRecords.forEach((record, index) => {
      sessionStorage.setItem(index + 1, record);
    });

    this.selectedStep = 'Step2';
    const indicatorEvent = new CustomEvent('getindicatorposition', {
      detail: this.selectedStep
    });
    this.dispatchEvent(indicatorEvent);
  }

  handleKeyChange(event) {
    const searchKey = event.target.value.toLowerCase();
    const previousPage = this.currentPage;
    let searchRecords = [];

    if(searchKey) {
      this.data = this.initialRecords;
      if (this.data) {
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
        this.currentPage = 1;
        this.data = searchRecords;
        this.updateDisplayedItems();

        console.log(searchRecords.length);
        if(searchRecords.length < 10 || previousPage === this.totalPages) this.isLastPage = true;
      }
    } else {
      this.data = this.initialRecords;
      this.updateDisplayedItems();
    }

    this.actualRecords = (this.currentPage - 1) * this.pageSize + this.displayedItems.length;
    this.currentPage = previousPage;
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

  // Generate car

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

  dataToEmail = [];

  generateDataToSendEmail() {
    let dataList = [];
    this.dataOfUmusSelected.forEach((umu => {
      let input = this.template.querySelectorAll('lightning-input[data-umu="' + umu.id + '"]');
      input.forEach((input => {
        let dataLine = {};
        dataLine.delegacion = umu.delegation;
        dataLine.umu = umu.number;
        dataLine.clavePresupuestal = umu.budget;
        dataLine.nombreUmu = umu.name;
        dataLine.tipoPedido = this.orderType
        dataLine.fechaSolicitud = new Date().toISOString().slice(0, 10);
        dataLine.claveInsumo = input.dataset.code;
        dataLine.producto = input.dataset.productname;
        dataLine.descripcion = input.dataset.description;
        dataLine.cantidadAutorizada = input.value;
        dataLine.cantidadSap = input.value;
        dataLine.estatus = 'AUTORIZADO'
        dataLine.programaId = this.programInfo.programCode;
        dataLine.programaNombre = this.programInfo.programName;
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

    const programName = this.programInfo.programName;
    const summaryJson = JSON.stringify(dataSummary);

    console.log('ContentVersion');
    console.log(JSON.stringify(contentVersion));
    console.log(summaryJson);
    console.log(programName);

    createContentVersion({ title: contentVersion.Title, versionData: contentVersion.VersionData, pathOnClient: contentVersion.PathOnClient,
      contactId: this.contactId, orderId: this.orderId, programName: programName, summaryJson: summaryJson})
    .then(result => {
      console.log('Operacion exitosa creando el ContentVersion: ');
      console.log(result);
    })
    .catch(error => {
      console.log('An error has occurred while creating the ContentVersion: ');
      console.log(error);
    });
  }

  orderId;

  generateCar() {
    this.carrito = [];
    let limitDate;
    this.umusSelected.forEach((row => {
      let dataLine = {};
      dataLine.Idcontacto = this.contactId;
      dataLine.IdUmu = row;
      dataLine.TipoDePedido = this.orderType;
      dataLine.esPrograma = true;
      if(this.maxDate) {
        limitDate = new Date(this.maxDate);
        limitDate.setDate(limitDate.getDate() + 1);
        dataLine.fechaMaxima = limitDate.toISOString().substring(0, 10);;
      }

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

    createOrders({ payload: JSON.stringify(this.carrito)})
    .then((result) => {
      if(result) {
        console.log('Pedido: ');
        console.log(JSON.stringify(result));

        // result.forEach(order => {
        //   generatePDF({idOrden: order.Id}).then(result => {
        //     console.log('Se ha generado exitosamente: ');
        //     console.log(JSON.parse(JSON.stringify(result)));
        //   }).catch(error =>{
        //     console.log('An error has occured: ' + error.getMessage());
        //   });
        // });

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

        this.showToast('Guardado', 'El pedido se ha guardado correctamente', 'success', 'pester');

        this[NavigationMixin.Navigate]({
          type: 'comm__namedPage',
          attributes:{
            name: "Mis_Pedidos__c"
          }
        });
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    });
  }

  // Modals

  async openConfirmationModal(carrito) {
    const result = await modalConfirmation.open({
      size: 'small',
      carrito: carrito
    });
    console.log(result);
  }

  async openModal(productCode) {
    const result = await modalDetail.open({
        size: 'small',
        productCode: productCode,
    });
    console.log(result);
  }
}