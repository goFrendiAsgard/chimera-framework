/* eslint-env jquery */

function cwGetRelationFieldOption (options) {
  let defaultOptions = {
    doPresent: (data, callback) => {},
    doShowEditor: (data, callback) => {},
    doUpdateValue: (data, callback) => {},
    defaultValue: []
  }
  for (let key in defaultOptions) {
    if (!(key in options)) {
      options[key] = defaultOptions[key]
    }
  }
  return options
}

function cwGetRelationFieldValue (inputId, defaultValue) {
  let value
  try {
    value = JSON.parse($('#' + inputId).val())
  } catch (error) {
    value = defaultValue
  }
  return value
}

function cwInitRelationField (inputId, options) {
  options = cwGetRelationFieldOption(options)
  let {doPresent, doShowEditor, doUpdateValue, defaultValue} = options
  let value = cwGetRelationFieldValue(inputId, defaultValue)
  let presentationContainerId = 'cwPresentation' + inputId
  let inputContainerId = 'cwInput' + inputId
  let originalInput = $('#' + inputId)
  let presentationContainer = $('<div id="' + presentationContainerId + ' ">', {}).insertBefore(originalInput)
  let inputContainer = $('<div id="' + inputContainerId + ' ">', {}).insertBefore(originalInput)
  originalInput.css('display', 'none')
  $(document).ready(function (event) {
    doPresent(value, (error, html) => {
      presentationContainer.html(html)
    })
    doShowEditor(value, (error, html) => {
      inputContainer.html(html)
    })
  })
}
