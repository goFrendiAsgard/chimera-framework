/* eslint-env jquery */

if (typeof $ === 'undefined') {
  var ace = {}
}

function cwInitAce () {
  $('textarea[data-editor]').each(function () {
    let textarea = $(this)
    let mode = textarea.data('editor') ? textarea.data('editor') : 'ejs'
    let editDiv = $('<div>', {
      position: 'absolute',
      width: textarea.width(),
      height: textarea.height(),
      'class': textarea.attr('class')
    }).insertBefore(textarea)
    textarea.css('display', 'none')
    let editor = ace.edit(editDiv[0])
    console.log('ace')
    editor.renderer.setShowGutter(false)
    editor.setOptions({
      showLineNumbers: true,
      showGutter: true,
      fontSize: 14,
      minLines: 5,
      maxLines: 25
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
  })
}

function cwSwitchTab (tab) {
  $('#form-tabs li').removeClass('active')
  $('#form-tabs a.nav-link[href="#' + tab + '"]').parent('li').addClass('active')
  $('*[data-tab]').hide()
  $('*[data-tab="' + tab + '"], *[data-tab=""]').show()
}

function cwLoadMany2OnePresentationContainer(componentFieldName, value, componentFieldInfo) {
  let {ref, keyField, fields} = componentFieldInfo
  let q = {}
  q[keyField] = value
  $.ajax({
    url: '/api/v1/' + ref + '?_q=' + JSON.stringify(q),
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
          html += '<table class="table table-bordered">'
          for (let fieldName of fields) {
            let fieldInfo = fieldInfoList[fieldName]
            let caption = fieldInfo.caption
            let value = row[fieldName]
            let presentation = ejs.render(fieldInfo['presentationTemplate'], {row, fieldName, fieldInfo, value})
            html += '<tr><th>' + caption + '</th><td>' + presentation + '</td></tr>'
          }
          html += '</table>'
        }
      }
      $('#' + componentFieldName + 'PresentationContainer').html(html)
    }
  })
}

function cwGetTableHeader (fields, fieldInfoList, addAction = false) {
  // table header
  let html = '<tr>'
  for (let fieldName of fields) {
    html += '<th>' + fieldInfoList[fieldName].caption + '</th>'
  }
  if (addAction) {
    html += '<th>Action</th>'
  }
  html += '</tr>'
  return html
}

function cwLoadMany2OneInputContainer(componentFieldName, inputContainer, componentFieldInfo) {
  let {ref, keyField, fields} = componentFieldInfo
  let keyword = $('#' + componentFieldName + 'SearchBox').val()
  $.ajax({
    url: '/api/v1/' + ref + '?_k=' + keyword,
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
          let presentation = ejs.render(fieldInfo['presentationTemplate'], { row, fieldInfo, value, fieldName})
          html += '<td>' + presentation + '</td>'
        }
        html += '<td><a class="' + componentFieldName + 'BtnSelect btn btn-default" value="' +row[keyField] + '" href="#" data-dismiss="modal">Select</a></td>'
        html += '</tr>'
      }
      // end of the table
      html += '</table>'
      inputContainer.html(html)
    }
  })
}

function cwLoadOne2ManyPresentationContainer (componentFieldName, value, componentFieldInfo) {
  let fieldInfoList = componentFieldInfo.fields
  let fields = Object.keys(fieldInfoList)
  let html = '<table class="table">'
  html += cwGetTableHeader(fields, fieldInfoList)
  for (let row of value) {
  }
  html += '</table>'
  $('#' + componentFieldName + 'PresentationContainer').html(html)
}

function cwLoadOne2ManyInputContainer (componentFieldName, inputContainer, componentFieldInfo) {
  let fieldInfoList = componentFieldInfo.fields
}

$(document).ready(function () {
  cwInitAce()
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