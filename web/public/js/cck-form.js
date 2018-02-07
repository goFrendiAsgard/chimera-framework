/* eslint-env jquery */

if (typeof $ === 'undefined') {
  var ace = {}
}

function cwInitAce () {
  $('textarea[data-editor]').each(function () {
    let textarea = $(this)
    if (!textarea.attr('rendered')) {
      let mode = textarea.data('editor') ? textarea.data('editor') : 'ejs'
      let editDiv = $('<div>', {
        position: 'absolute',
        //width: textarea.width(),
        height: textarea.height(),
        'class': textarea.attr('class')
      }).insertBefore(textarea)
      textarea.css('display', 'none')
      let editor = ace.edit(editDiv[0])
      editor.renderer.setShowGutter(false)
      editor.setOptions({
        showLineNumbers: true,
        showGutter: true,
        fontSize: 14,
        minLines: 5,
        maxLines: 35,
      })
      editor.$blockScrolling = Infinity
      editor.setTheme('ace/theme/github')
      editor.getSession().setMode('ace/mode/' + mode)
      editor.getSession().setTabSize(2)
      editor.getSession().setUseSoftTabs(true)
      editor.getSession().setValue(textarea.val())
      editor.getSession().on('change', function () {
        textarea.val(editor.getSession().getValue())
      })
      textarea.change(function(event) {
        editor.setValue($(this).val(), 1)
      })
      textarea.attr('rendered', '1')
    }
  })
}

function cwSwitchTab (tab) {
  $('#form-tabs li').removeClass('active')
  $('#form-tabs a.nav-link[href="#' + tab + '"]').parent('li').addClass('active')
  $('*[data-tab]').hide()
  $('*[data-tab="' + tab + '"], *[data-tab=""]').show()
}

function cwPreprocessValue (value) {
  if (typeof value === 'null' || typeof value === 'undefined' || (typeof value === 'string' && value.trim() === '')) {
    return '<i>[Not set]</i>'
  }
  return value
}

function cwLoadMany2OnePresentationContainer(componentId, componentFieldInfo) {
  let {ref, keyField, fields} = componentFieldInfo
  let value = $('#' + componentId).val()
  let q = {}
  q[keyField] = value
  $.ajax({
    url: '/api/v1/' + ref + '?_includeFieldInfo=1&_q=' + JSON.stringify(q),
    method: 'get',
    dataType: 'json',
    success: function (response) {
      let results = response.results
      let fieldInfoList = response.metadata.fieldInfo
      let html = ''
      if (results.length === 0) {
        html = value
      } else {
        let row = results[0]
        if (fields.length === 1) {
          html = row[fields[0]]
        } else {
          html += '<div style="font-size:small">'
          for (let fieldName of fields) {
            let fieldInfo = fieldInfoList[fieldName]
            let caption = fieldInfo.caption
            let value = row[fieldName]
            let template = 'tabularPresentationTemplate' in fieldInfo ? fieldInfo.tabularPresentationTemplate : fieldInfo.presentationTemplate
            let presentation = ejs.render(template, {row, fieldName, fieldInfo, value})
            html += '<div class="col-sm-4" style="padding-left:0px; overflow-x:hidden;"><b>' + caption + '</b></div>'
            html += '<div class="col-sm-8">' + cwPreprocessValue(presentation) + '</div>'
          }
          html += '</div>'
        }
      }
      html = cwPreprocessValue(html)
      $('#' + componentId + 'PresentationContainer').html(html)
    }
  })
}

function cwGetTableHeader (fields, fieldInfoList, addAction = false) {
  let fieldCount = fields.length
  let gridCount = addAction? 11 : 12
  let colWidth = Math.floor(gridCount / fieldCount)
  let actionWidth = addAction ? 12 - (colWidth * fieldCount) : 0
  let colClass = ''
  let actionClass = ''
  if (colWidth > 0) {
    colClass= 'col-sm-' + colWidth
    actionClass= 'col-sm-1'
  }
  // table header
  let html = '<tr>'
  for (let fieldName of fields) {
    html += '<th class="' + colClass + '">' + fieldInfoList[fieldName].caption + '</th>'
  }
  if (addAction) {
    html += '<th class="' + actionClass + '">Action</th>'
  }
  html += '</tr>'
  return html
}

function cwLoadMany2OneInputContainer(componentId, componentFieldInfo) {
  $('#' + componentId + 'InputContainer').html('')
  let {ref, keyField, fields} = componentFieldInfo
  let keyword = $('#' + componentId + 'SearchBox').val()
  $.ajax({
    url: '/api/v1/' + ref + '?_includeFieldInfo=1&_k=' + keyword,
    method: 'get',
    dataType: 'json',
    success: function (response) {
      let results = response.results
      let fieldInfoList = response.metadata.fieldInfo
      // build the table
      let html = '<table class="table">'
      // table header
      html += cwGetTableHeader(fields, fieldInfoList, true)
      // table content
      for (let row of results) {
        html += '<tr>'
        for (let fieldName of fields) {
          let fieldInfo = fieldInfoList[fieldName]
          let caption = fieldInfo.caption
          let value = row[fieldName]
          let template = 'tabularPresentationTemplate' in fieldInfo ? fieldInfo.tabularPresentationTemplate : fieldInfo.presentationTemplate
          let presentation = ejs.render(template, { row, fieldInfo, value, fieldName})
          html += '<td>' + presentation + '</td>'
        }
        html += '<td><a class="' + componentId + 'BtnSelect btn btn-default" value="' +row[keyField] + '" href="#" data-toggle="modal" data-target="#' + componentId + 'ModalContainer"><span class="glyphicon glyphicon-ok"></span></a></td>'
        html += '</tr>'
      }
      // end of the table
      html += '</table>'
      $('#' + componentId + 'InputContainer').html(html)
    }
  })
}

function cwGetOne2ManyFieldValue (componentId) {
  let value = $('#' + componentId).val()
  try {
    value = JSON.parse(value)
  } catch (error) {
    value = []
  }
  return value
}

function cwLoadOne2ManyPresentationContainer (componentId, componentFieldInfo) {
  let fieldInfoList = componentFieldInfo.fields
  let fields = Object.keys(fieldInfoList)
  let value = cwGetOne2ManyFieldValue(componentId)
  let html = ''
  if (value.length > 0) {
    html += '<table class="table table-bordered" style="font-size:small">'
    html += cwGetTableHeader(fields, fieldInfoList)
    for (let row of value) {
      html += '<tr>'
      for (let fieldName of fields) {
        let fieldInfo = fieldInfoList[fieldName]
        let value = row[fieldName]
        let presentation = ejs.render(fieldInfo['presentationTemplate'], { row, fieldName, fieldInfo, value })
        html += '<td>' + presentation + '</td>'
      }
      html += '</tr>'
    }
    html += '</table>'
  }
  html = cwPreprocessValue(html)
  $('#' + componentId + 'PresentationContainer').html(html)
}

function cwGetOne2ManyTableRow (row, fieldInfoList) {
  let html = '<tr class="row-data">'
  for (let fieldName in fieldInfoList) {
    let fieldInfo = fieldInfoList[fieldName]
    let value = fieldName in row ? row[fieldName] : ''
    let presentation = ejs.render(fieldInfo['inputTemplate'], { row, fieldName, fieldInfo, value })
    html += '<td fieldName="' + fieldName + '">' + presentation + '</td>'
  }
  html += '<td><a class="btnDeleteRow btn btn-default" href="#"><span class="glyphicon glyphicon-remove"></span> </a></td>'
  html += '</tr>'
  return html
}

function cwLoadOne2ManyInputContainer (componentId, componentFieldInfo) {
  $('#' + componentId + 'InputContainer').html('')
  let fieldInfoList = componentFieldInfo.fields
  let fields = Object.keys(fieldInfoList)
  let value = cwGetOne2ManyFieldValue(componentId)
  if (!Array.isArray(value)) { value = [] }
  let html = '<table id="' + componentId + 'Table" class="table">'
  html += cwGetTableHeader(fields, fieldInfoList, true)
  for (let row of value) {
    html += cwGetOne2ManyTableRow(row, fieldInfoList)
  }
  html += '</table>'
  $('#' + componentId + 'InputContainer').html(html)
  cwInitAce()
}

$(document).ready(function () {
  // init aceEditors
  cwInitAce()

  // handle tabs
  if ($('#form-tabs li.active a').attr('href')) {
    let tab = $('#form-tabs li.active a').attr('href').slice(1)
    // don't know, but seems we have to delay this in order to make ace rendered correctly
    setTimeout(function () { cwSwitchTab(tab) }, 50)
  }
  $('#form-tabs a.nav-link').click(function (event) {
    let tab = $(this).attr('href').slice(1)
    cwSwitchTab(tab)
    event.preventDefault()
  })

})