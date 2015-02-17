define([
  'backbone',
  'marionette',
  'hbs!./templates/abstract-nav'

], function(
  Backbone,
  Marionette,
  tocNavigationTemplate
  ){


  var WidgetData = Backbone.Model.extend({
    defaults : function(){
      return {
        id: undefined, // widgetId
        path: undefined,
        title: undefined,
        showCount: false,
        category: undefined,
        isActive : false,
        isSelected: false,
        numFound : 0,
        showCount: true
      }
    }
  });

  var WidgetCollection = Backbone.Collection.extend({
    model : WidgetData,
    selectOne: function(widgetId) {
      var s = null;
      this.each(function(m) {
        if (m.id == widgetId) {
          s = m;
        }
        else {
          m.set("isSelected", false, {silent: true});
        }
      });
      s.set("isSelected", true);
    }
  });


  var WidgetModel = Backbone.Model.extend({

    defaults : function(){
      return {
        bibcode : undefined,
        query: undefined
      }
    }
  });

  var TocNavigationView = Marionette.ItemView.extend({

    constructor: function(options) {
      options = options || {};
      if (!options.collection)
        options.collection = new WidgetCollection();

      if (!options.model)
        options.model = new WidgetModel();

      Marionette.ItemView.prototype.constructor.call(this, options);
      this.on("page-manager-message", this.onPageManagerMessage);
    },

    serializeData : function(){
      var data = {},
          groupedCollectionJSON;

      data = _.extend(data, this.model.toJSON());

      groupedCollectionJSON = _.groupBy(this.collection.toJSON(), function(object){
        return object.category;
      });

      data = _.extend(data, groupedCollectionJSON);

      return data;
    },

    template : tocNavigationTemplate,

    events : {
      "click a" : function(e){
       var $t  = $(e.currentTarget);
        var idAttribute = $t.find("div").attr("data-widget-id");
        if ($t.find("div").hasClass("s-nav-inactive")){
          return false;
        }
        else if (idAttribute !== $(".s-nav-active").attr("data-widget-id")) {
          var href = $(e.currentTarget).attr("href");
          this.trigger('page-manager-event', 'widget-selected', {idAttribute: idAttribute, href : href});
          this.collection.selectOne(idAttribute);
        }
        return false;
      }
    },

    modelEvents : {
      "change:bibcode" : "resetActiveStates"
    },

    collectionEvents : {
      "add": "render",
      "change:isActive" : "render",
      "change:isSelected": "render",
      "change:numFound" : "render"
    },

    /*
      every time the bibcode changes (got by subscribing to this.pubsub.DISPLAY_DOCUMENTS)
      clear the collection of isactive and numfound in the models, so that the next view on
      the widget will show the appropriate defaults
     */
    resetActiveStates : function(){
      this.collection.each(function(model){
        var alwaysThere = ["ShowAbstract"];
        //reset only widgets that aren't ther 100% of the time
        if (!_.contains(alwaysThere, model.id)){
        model.set("isActive", false);
        model.set("numFound", 0);
        }
      });
    },

    onPageManagerMessage: function(event, data) {
      if (event == 'new-widget') {
        //this.collection.set([new WidgetData({widgetData: arguments[1]})]);
        var widgetId = arguments[1]; var parent = this.$el.parent();
        if (parent.data(widgetId.toLowerCase())) {
          var title = widgetId; var path = '';
          var defs = _.clone(parent.data(widgetId.toLowerCase()));
          defs.id = widgetId;
          this.collection.add(defs);
        }
      }
      else if (event == 'widget-ready') {
        var model = this.collection.get(data.widgetId);
        _.defaults(data, {isActive: data.numFound ? true : false});
        if (model) {
          model.set(_.pick(data, model.keys()));
        }
      }
      else if (event === "broadcast-payload"){
        this.model.set("bibcode", data.bibcode);
      }
    }

  });

  return TocNavigationView;
});