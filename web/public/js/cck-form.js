/* eslint-env jquery */

if (typeof $ === 'undefined') {
  var ace = {}
}

function cwInitAce () {
  $('textarea[data-editor]').each(function () {
    var textarea = $(this)
    var mode = textarea.data('editor') ? textarea.data('editor') : 'ejs'
    var editDiv = $('<div>', {
      position: 'absolute',
      width: textarea.width(),
      height: textarea.height(),
      'class': textarea.attr('class')
    }).insertBefore(textarea)
    textarea.css('display', 'none')
    var editor = ace.edit(editDiv[0])
    console.log('ace')
    editor.renderer.setShowGutter(false)
    editor.getSession().setMode('ace/mode/' + mode)
    editor.setOptions({
      showLineNumbers: true,
      showGutter: true,
      fontSize: 14,
      minLines: 5,
      maxLines: 25
    })
    editor.$blockScrolling = Infinity
    editor.setTheme('ace/theme/monokai')
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

$(document).ready(function () {
  cwInitAce()
  if ($('#form-tabs li.active a').attr('href')) {
    var tab = $('#form-tabs li.active a').attr('href').slice(1)
    // don't know, but seems we have to delay this in order to make ace rendered correctly
    setTimeout(function () { cwSwitchTab(tab) }, 500)
  }
})

$('#form-tabs a.nav-link').click(function (event) {
  var tab = $(this).attr('href').slice(1)
  cwSwitchTab(tab)
  event.preventDefault()
})
