/* eslint-env jquery */

if (typeof $ === 'undefined') {
  var ace = {}
}

$(document).ready(function () {
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
    editor.renderer.setShowGutter(false)
    editor.getSession().setMode('ace/mode/' + mode)
    editor.setOptions({
      showLineNumbers: true,
      showGutter: true,
      fontSize: 14
    })
    editor.$blockScrolling = Infinity
    editor.setTheme('ace/theme/monokai')
    editor.getSession().setValue(textarea.val())

    editor.getSession().on('change', function () {
      textarea.val(editor.getSession().getValue())
    })
  })
})
