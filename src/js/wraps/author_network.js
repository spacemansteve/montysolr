define([
  'js/widgets/network_vis/network_widget'
], function(
  NetworkWidget
  ) {

  var options = {};

  options.endpoint = "services/vis/author-network";

  options.helpText = "<p>The author network groups authors from your result set based on " +
    "how many papers they have co-authored together. The size of the author node represents how " +
    "many times that author name appeared in your results set.</p>" +
    "<p>If your result set is large enough, you will see a summary graph made up of author groups." +
    "These groups are generated by a community detection algorithm, and their sizes represent the cumulative" +
    "frequency of occurence in the result set of all their members. </p>";

  options.networkType = "author";

  return function(){

    return new NetworkWidget(options);

  };



});