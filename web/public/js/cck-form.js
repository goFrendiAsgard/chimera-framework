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

function cwLoadMany2OnePresentationContainer(fieldName, value, ref, keyField, fields) {
  let q = {}
  q[keyField] = value
  $.ajax({
    url: '/api/v1/' + ref + '?_q=' + JSON.stringify(q),
    method: 'get',
    dataType: 'json',
    success: function (response) {
      let results = response.results
      let html = ''
      if (results.length === 0) {
        html = value
      } else {
        let row = results[0]
        if (fields.length === 1) {
          html = row[fields[0]]
        } else {
          for (let field of fields) {
            html += '<b>' + field + ':</b> ' + row[field] + '<br />'
          }
        }
      }
      $('#' + fieldName + 'PresentationContainer').html(html)
    }
  })
}

function cwLoadMany2OneInputContainer(fieldName, inputContainer, ref, keyField, fields) {
  let keyword = $('#' + fieldName + 'SearchBox').val()
  $.ajax({
    url: '/api/v1/' + ref + '?_k=' + keyword,
    method: 'get',
    dataType: 'json',
    success: function (response) {
      let results = response.results

      // build the table
      let html = '<table class="table">'

      // table header
      html += '<tr>'
      for (let field of fields) {
        html += '<th>' + field + '</th>'
      }
      html += '<th>Action</th>'
      html += '</tr>'

      // table content
      for (let row of results) {
        html += '<tr>'
        for (let field of fields) {
          html += '<td>' + row[field] + '</td>'
        }
        html += '<td><a class="' + fieldName + 'BtnSelect btn btn-default" value="' +row[keyField] + '" href="#" data-dismiss="modal">Select</a></td>'
        html += '</tr>'
      }

      // end of the table
      html += '</table>'

      inputContainer.html(html)
    }
  })
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