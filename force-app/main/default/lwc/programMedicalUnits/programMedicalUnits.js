import { LightningElement, track, wire } from 'lwc';
import getUmuPicklist from '@salesforce/apex/UmuController.getUmuMultiSelectOptions';
import getAllUmus from '@salesforce/apex/UmuController.getAllUmus';
import getUmuDelegationByType from '@salesforce/apex/UmuController.getUmuDelegationByType';
import getUmuByType from '@salesforce/apex/UmuController.getUmuByType';
import getUmuByTypeAndDelegation from '@salesforce/apex/UmuController.getUmuByTypeAndDelegation';

export default class ProgramMedicalUnits extends LightningElement {
  @track optionsUmuType = [];
  @track optionsDelegation = [];
  @track optionsUmu = [];
  @track allOptionsUmu = [];
  @track allOptionsDelegation = [];

  @track isUmuTypeDataLoaded = false;
  @track isDelegationDataLoaded = false;
  @track isUmuDataLoaded = false;
  @track isDataLoading = true;
  @track maxDeliveryDate;
  @track today = new Date();
  @track minDate = this.getMinimumDate();
  
  umuTypeSelectedValues = [];
  delegationSelectedValues = [];
  umuSelectedValues = [];

  umuTypes = [];
  delegations = [];
  rendered = false;
  orderType = '';
  selectedStep;

  connectedCallback() {
    this.getUmuType();
    this.getDelegation();
    this.getUmus();
    console.log('minDate: ' + this.minDate);
  }

  renderedCallback() {
    if(this.rendered == false) {
      this.addUmusBtn = this.template.querySelector('lightning-button[data-name="addUmusBtn"]');
      this.rendered = true;
    }
  }

  get optionsOrderType() {
    return [
      { label: "Soporte de Vida", value: "Soporte de Vida" },
      { label: "Urgencia Médica", value: "Urgencia Médica" },
      { label: "Emergencia Sanitaria", value: "Emergencia Sanitaria" },
      { label: "Programa", value: "Programa" },
    ];
  }

  handleClickSelect(event) {

    if(this.orderType == "Soporte de Vida" || this.orderType == "Urgencia Médica") this.maxDeliveryDate = '';
    this.selectedStep = 'Step3';

    if(this.umuSelectedValues.length == 0) {
      this.optionsUmu.forEach((row) => {
        this.umuSelectedValues.push(row.key);
      })
      console.log("Umus totales: " + this.umuSelectedValues);
    }

    const indicatorEvent = new CustomEvent('getdatafrommedicalunits', {
      detail: {
        step: this.selectedStep,
        umus: this.umuSelectedValues,
        orderType: this.orderType,
        maxDate: this.maxDeliveryDate
      }
    });

    this.dispatchEvent(indicatorEvent);
  }

  getUmuType() {
    getUmuPicklist({ objectName: "Account", fieldName: "Tipo_UMU__c" })
    .then((result) => {
      if(result) {
        let optionList = [];
        result.forEach((row) => {
          let dataLine = {};
          dataLine.key = row.value;
          dataLine.value = row.label;
          optionList.push(dataLine);
        })
        this.optionsUmuType = optionList;
        this.isUmuTypeDataLoaded = true;
      }
    })
    .catch((error) => {
      this.error = error;
      console.log(JSON.stringify(error));
    })
  }

  getUmus() {
    if(this.delegations.length == 0 && this.umuTypes.length == 0) {
      getAllUmus()
      .then((result) => {
        console.log('inside getAllUmus');
        if(result) {
          let optionList = [];
          result.forEach((row) => {
            let dataLine = {};
            dataLine.key = row.Id;
            dataLine.value = row.Name;
            optionList.push(dataLine);
          })
          this.allOptionsUmu = optionList;
          this.optionsUmu = optionList;
          this.isUmuDataLoaded = true;
          this.isDataLoading = false;
        }
      })
      .catch((error) => {
        this.error = error;
        console.log(JSON.stringify(error));
      })
    } else if(this.delegations.length == 0) {
      getUmuByType({ umuTypes: this.umuTypes })
      .then((result) => {
        console.log('inside getUmuByType');
        console.log(result);
        if(result) {
          let optionList = [];
          result.forEach((row) => {
            let dataLine = {};
            dataLine.key = row.Id;
            dataLine.value = row.Name;
            optionList.push(dataLine);
          })
          this.optionsUmu = optionList;
        }
      })
      .catch((error) => {
        this.error = error;
        console.log(JSON.stringify(error));
      })
    } else {
      getUmuByTypeAndDelegation({ umuTypes: this.umuTypes, umuDelegations: this.delegations })
      .then((result) => {
        console.log('inside getUmuByTypeAndDelegation');
        console.log(result);
        if(result) {
          let optionList = [];
          result.forEach((row) => {
            let dataLine = {};
            dataLine.key = row.Id;
            dataLine.value = row.Name;
            optionList.push(dataLine);
          })
          this.optionsUmu = optionList;
        }
      })
      .catch((error) => {
        this.error = error;
        console.log(JSON.stringify(error));
      })
    }
  }

  getDelegation() {
    if(!this.isDelegationDataLoaded) {
      getUmuPicklist({ objectName: "Account", fieldName: "Delegaci_n__c" })
      .then((result) => {
        if(result) {
          let optionList = [];
          result.forEach((row) => {
            let dataLine = {};
            dataLine.key = row.value;
            dataLine.value = row.label;
            optionList.push(dataLine);
          })
          this.allOptionsDelegation = optionList;
          this.optionsDelegation = optionList;
          this.isDelegationDataLoaded = true;
        }
      })
      .catch((error) => {
        this.error = error;
        console.log(JSON.stringify(error));
      })
    } else {
      getUmuDelegationByType({ umuTypes: this.umuTypes})
      .then((result) => {
        if(result) {
          let optionList = [];
          result.forEach((row) => {
            let dataLine = {};
            dataLine.key = row.Delegaci_n__c;
            dataLine.value = row.Delegaci_n__c;

            if(optionList.findIndex(object => object.key === dataLine.key) == -1 && dataLine.key != null) {
              optionList.push(dataLine);
            }
          })
          this.optionsDelegation = optionList;
        }
      })
      .catch((error) => {
        this.error = error;
        console.log(JSON.stringify(error));
      })
    }
  }

  handleOnItemSelectedUmuType(event) {
    if(event.detail) {
      this.umuTypeSelectedValues = [];
      let self = this;

      event.detail.forEach(function (eachItem) {
        self.umuTypeSelectedValues = [...self.umuTypeSelectedValues, eachItem.value];
      });

      if(this.umuTypeSelectedValues.length > 0) {
        this.umuTypes = this.umuTypeSelectedValues;
      }
      else {
        this.umuTypes = [];
        this.delegations = [];
        this.delegationSelectedValues = [];
        this.isDelegationDataLoaded = false;
      }

      this.getDelegation();
      this.getUmus();
      this.handleBtnDisabled();
    }
  }

  handleOnItemSelectedDelegation(event) {
    if(event.detail) {
      this.delegationSelectedValues = [];
      let self = this;

      event.detail.forEach(function (eachItem) {
        self.delegationSelectedValues = [...self.delegationSelectedValues, eachItem.value];
      });

      if(this.delegationSelectedValues.length > 0) {
        this.delegations = this.delegationSelectedValues;
      }
      else {
        this.delegations = [];
      }

      if(this.umuTypeSelectedValues.length > 0) this.getUmus();

      console.log(JSON.stringify(this.umuTypeSelectedValues));
      console.log(JSON.stringify(this.delegationSelectedValues));

      this.handleBtnDisabled();
    }
  }

  handleOnItemSelectedUmu(event) {
    if(event.detail) {
      this.umuSelectedValues = [];
      let self = this;

      event.detail.forEach(function (eachItem) {
        self.umuSelectedValues = [...self.umuSelectedValues, eachItem.key];
      });

      console.log(JSON.stringify(this.umuTypeSelectedValues));
      console.log(JSON.stringify(this.delegationSelectedValues));
      console.log(JSON.stringify(this.umuSelectedValues));

      this.handleBtnDisabled();
    }
  }

  handleChange(event) {
    this.orderType = event.detail.value;
    console.log(this.orderType);
    let calendar = this.template.querySelector('lightning-input[data-name="calendar"]');

    if(this.orderType == "Programa" || this.orderType == "Emergencia Sanitaria") {
      calendar.disabled = false;
    } else {
      calendar.disabled = true;
    }

    this.handleBtnDisabled();
  }

  isBusinessDay(date) {
    const dayOfWeek = new Date(date).getDay();
    return dayOfWeek !== 5 && dayOfWeek !== 6;
  }

  getMinimumDate() {
    const minimumDate = new Date(this.today.getTime() + 2 * 24 * 60 * 60 * 1000);
    console.log('MinimumDay0: ' + minimumDate.getDay());
    if (minimumDate.getDay() === 6) { // Sabado
      minimumDate.setDate(minimumDate.getDate() + 2); // Agregar 2 días
    } else if (minimumDate.getDay() === 0) { // Domingo
      minimumDate.setDate(minimumDate.getDate() + 1); // Agregar 1 día
    }
    console.log('MinimumDay: ' + minimumDate.getDay());
    return minimumDate.toISOString().split('T')[0];
  }

  isValidDate;

  handleCalendar(event) {
    const selectedDate = event.target.value;

    if (selectedDate < this.minDate) {
      const message = `La fecha mínima de entrega es ${this.minDate}`;
      event.target.setCustomValidity(message);
      this.isValidDate = false;  
    } else if (!this.isBusinessDay(selectedDate)) {
      event.target.setCustomValidity('La fecha de entrega debe especificarse de lunes a viernes');
      this.isValidDate = false;
    } else {
      event.target.setCustomValidity('');
      this.isValidDate = true;
      this.maxDeliveryDate = selectedDate;
    }

    console.log('Date: ' + this.maxDeliveryDate);
    this.handleBtnDisabled();
  }

  handleBtnDisabled() {
    if(this.orderType == "Programa" || this.orderType == "Emergencia Sanitaria") {
      if(this.umuTypeSelectedValues.length > 0 && this.orderType != '' 
      && this.maxDeliveryDate != null && this.maxDeliveryDate != '' && this.isValidDate) {
        if(this.addUmusBtn.disabled == true) this.addUmusBtn.disabled = false;
      } else {
        if(this.addUmusBtn.disabled == false) this.addUmusBtn.disabled = true;
      }
    } else {
      if(this.umuTypeSelectedValues.length > 0 && this.orderType != '') {
        if(this.addUmusBtn.disabled == true) this.addUmusBtn.disabled = false;
      } else {
        if(this.addUmusBtn.disabled == false) this.addUmusBtn.disabled = true;
      }
    }
  }

  // const child = this.template.querySelector('c-pick-list-multiselect[data-name="delegation"]');
  // console.log(child);
  // child.onRefreshClick();
}