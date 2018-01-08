$(document).ready(function() {
  if ($('#form-tabs li.active a').attr('href')) {
    var tab = $('#form-tabs li.active a').attr('href').slice(1);
    cwSwitchTab(tab);
  }
});

$('#form-tabs a.nav-link').click(function (event) {
  var tab = $(this).attr('href').slice(1);
  cwSwitchTab(tab);
  event.preventDefault();
})

function cwSwitchTab(tab) {
  $('#form-tabs li').removeClass('active');
  $('#form-tabs a.nav-link[href="#' + tab + '"]').parent('li').addClass('active');
  $('*[data-tab]').hide();
  $('*[data-tab="' + tab + '"], *[data-tab=""]').show();
}
