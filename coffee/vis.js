(function() {
  var Network, activate, root;

  Network = function() {
    var allData, charge, checker, curLinksData, curNodesData, popularityFilter, industryFilter, filterLinks, force, forceTick, groupCenters, height, 
    hideDetails, layout, link, linkLabel, linkedByIndex, linksG, mapNodes, neighboring, network, 
    node, nodeColors, nodeCounts, nodesG, popularityNodes, industryNodes, setPopularityFilter, setLayout, setupData, showDetails,
    strokeFor, tooltip, update, updateLinks, updateNodes, updateNodeLabels, updateLinkLabels, width;
    // variables we want to access in multiple places of Network
    width = 960;
    height = 600;
    // allData will store the unfiltered data
    allData = [];
    curLinksData = [];
    curNodesData = [];
    linkedByIndex = {};
    // these will hold the svg groups for accessing the nodes and links display
    nodesG = null;
    linksG = null;
    // these will point to the circles and lines of the nodes and links
    node = null;
    link = null;
    // variables to refect the current settings of the visualization
    popularityFilter = "all";
    industryFilter = "all";
    //checker = false;
    // our force directed layout
    force = d3.layout.force();
    // color function used to color nodes
    nodeColors = d3.scale.category20();
    // tooltip used to display details
    tooltip = Tooltip("vis-tooltip", 230);
    // charge used in position layout
    charge = function(node) {
      return -Math.pow(node.radius, 2.0) / 2;
    };

    //Starting point for network visualization (force layout)
    network = function(selection, data) {
      var vis;
      // format our data
      allData = setupData(data);
      // create our svg and groups
      vis = d3.select(selection).append("svg").attr("width", width).attr("height", height);
      linksG = vis.append("g").attr("id", "links");
      nodesG = vis.append("g").attr("id", "nodes");
      //setup the size of the force environment
      force.size([width, height]);
      setLayout();
      setPopularityFilter("all");
      setIndustryFilter("all");
      // perform rendering and start force layout
      return update();
    };

    /* Update() is called everytime a parameter changes
      and the network needs to be reset. */
    update = function() {
      // filter data to show based on current filter settings.
      curNodesData = popularityNodes(allData.nodes);
      curNodesData = industryNodes(curNodesData);
      curLinksData = filterLinks(allData.links, curNodesData);
      // reset nodes in force layout
      force.nodes(curNodesData);
      // enter / exit for nodes
      updateNodes();
      updateNodeLabels();
      // always show links in force layout
      force.links(curLinksData);
      updateLinks();
      updateLinkLabels();
      
      return force.start();
    };

    // Public function to switch between popularity options
    network.togglePopularityFilter = function(newFilter) {
      force.stop();
      setPopularityFilter(newFilter);
      return update();
    };

    // Public function to switch between industry options
    network.toggleIndustryFilter = function(newFilter) {
      force.stop();
      setIndustryFilter(newFilter);
      return update();
    };

    // Public function to show names of nodes
    /*network.showName = function(newChecker) {
      force.stop();
      checker = newChecker
      return update();
    };*/

    // Public function to update highlighted nodes from search based on name
    network.updateSearch = function(searchTerm) {
      var searchRegEx;
      searchRegEx = new RegExp(searchTerm.toLowerCase());
      return node.each(function(d) {
        var element, matchName, matchCompany, matchDepartment, matchPosition, matchTechnicalarea;
        element = d3.select(this);
        matchName = d.name.toLowerCase().search(searchRegEx);
        matchCompany = d.company.toLowerCase().search(searchRegEx);
        matchDepartment = d.department.toLowerCase().search(searchRegEx);
        matchPosition = d.position.toLowerCase().search(searchRegEx);
        matchTechnicalarea = d.technicalarea.toLowerCase().search(searchRegEx);
        if (searchTerm.length > 0 && matchName >= 0) {
          element.style("fill", "red").style("stroke-width", 3.0).style("stroke", "#555");
          return d.searched = true;
        } else if (searchTerm.length > 0 && matchCompany >= 0) {
          element.style("fill", "red").style("stroke-width", 3.0).style("stroke", "#555");
          return d.searched = true;
        } else if (searchTerm.length > 0 && matchDepartment >= 0) {
          element.style("fill", "red").style("stroke-width", 3.0).style("stroke", "#555");
          return d.searched = true;
        } else if (searchTerm.length > 0 && matchPosition >= 0) {
          element.style("fill", "red").style("stroke-width", 3.0).style("stroke", "#555");
          return d.searched = true;
        } else if (searchTerm.length > 0 && matchTechnicalarea >= 0) {
          element.style("fill", "red").style("stroke-width", 3.0).style("stroke", "#555");
          return d.searched = true;
        } else {
          d.searched = false;
          return element.style("fill", function(d) {
            return nodeColors(d.industry);
          }).style("stroke-width", 1.0);
        }
      });
    };

    network.updateData = function(newData) {
      allData = setupData(newData);
      link.remove();
      node.remove();
      return update();
    };

    //Called to clean raw data and switch links to point to node instances
    setupData = function(data) {
      var circleRadius, countExtent, countExtentForCommonEvent, lineThickness, nodesMap;
      // initialize circle radius scal
      countExtent = d3.extent(data.nodes, function(d) {
        return d.eventcount;
      });
      circleRadius = d3.scale.sqrt().range([6, 15]).domain(countExtent);
      // set initial x/y to values within the width/height of the visualization
      data.nodes.forEach(function(n) {
        var randomnumber;
        n.x = randomnumber = Math.floor(Math.random() * width);
        n.y = randomnumber = Math.floor(Math.random() * height);
        return n.radius = circleRadius(n.eventcount);
      });
      // id's -> node objects
      nodesMap = mapNodes(data.nodes);
      // switch links to point to node objects instead of id's
      countExtentForCommonEvent = d3.extent(data.links, function(d) {
        return d.commoneventcount;
      });
      lineThickness = d3.scale.sqrt().range([1, 10]).domain(countExtentForCommonEvent);
      data.links.forEach(function(l) {
        l.source = nodesMap.get(l.source);
        l.target = nodesMap.get(l.target);
        l.weightage = lineThickness(l.commoneventcount);
        // linkedByIndex is used for link sorting
        return linkedByIndex[l.source.id + "," + l.target.id] = 1;
      });
      return data;
    };

    // Helper function to map node id's to node objects.
    mapNodes = function(nodes) {
      var nodesMap;
      nodesMap = d3.map();
      nodes.forEach(function(n) {
        return nodesMap.set(n.id, n);
      });
      return nodesMap;
    };

    // Helper function that returns an associative array
    nodeCounts = function(nodes, attr) {
      var counts;
      counts = {};
      nodes.forEach(function(d) {
        var name;
        if (counts[name = d[attr]] == null) {
          counts[name] = 0;
        }
        return counts[d[attr]] += 1;
      });
      return counts;
    };

    /* Given two nodes a and b, returns true if
      there is a link between them.
      Uses linkedByIndex initialized in setupData */
    neighboring = function(a, b) {
      return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
    };

    // Removes nodes from input array based on current popularity setting. 
    popularityNodes = function(allNodes) {
      var cutoff, eventcounts, filteredNodes;
      filteredNodes = allNodes;
      if (popularityFilter === "popular" || popularityFilter === "obscure") {
        eventcounts = allNodes.map(function(d) {
          return d.eventcount;
        }).sort(d3.ascending);
        cutoff = d3.quantile(eventcounts, 0.5);
        filteredNodes = allNodes.filter(function(n) {
          if (popularityFilter === "popular") {
            return n.eventcount > cutoff;
          } else if (popularityFilter === "obscure") {
            return n.eventcount <= cutoff;
          }
        });
      }
      return filteredNodes;
    };

    // Removes nodes from input array based on current popularity setting. 
    industryNodes = function(allNodes) {
      var filteredNodes;
      filteredNodes = allNodes;
      if (industryFilter != "all" ) {
        eventcounts = allNodes.map(function(d) {
          return d.industry;
        }).sort(d3.ascending);
        filteredNodes = allNodes.filter(function(n) {
          if (industryFilter === "clinic") {
            return n.industry === "Clinic";
          } else if (industryFilter === "hospital") {
            return n.industry === "Hospital";
          } else if (industryFilter === "pharmacy") {
            return n.industry === "Pharmacy";
          }
        });
      }
      return filteredNodes;
    };

    /* Removes links from allLinks whose
      source or target is not present in curNodes
      Returns array of links */
    filterLinks = function(allLinks, curNodes) {
      curNodes = mapNodes(curNodes);
      return allLinks.filter(function(l) {
        return curNodes.get(l.source.id) && curNodes.get(l.target.id);
      });
    };

    //enter/exit display for nodes
    updateNodes = function() {
      node = nodesG.selectAll(".node").data(curNodesData, function(d) {
        return d.id;
      });
      node.enter().append("circle").attr("class", "node")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .attr("r", function(d) { return d.radius; })
        .style("fill", function(d) { return nodeColors(d.industry); })
        .style("stroke", function(d) { return strokeFor(d); })
        .style("stroke-width", 1.0)
        .call(force.drag);

      node.on("mouseover", showDetails).on("mouseout", hideDetails);

      return node.exit().remove();
    };

    //enter/exit display for nodes labels
    updateNodeLabels = function() {
      nodeLabel = nodesG.selectAll(".nodeLabel").data(curNodesData, function(d){
        return d.id;
      });
      nodeLabel.enter().append("text")
        .attr("class", "nodeLabel")
        .style("font", "normal 8px Arial")
        .attr("x", function(d){return d.x;})
        .attr("y", function(d){return d.y;})
        .text(function(d){return d.name;});

      return nodeLabel.exit().remove();
    };

    // enter/exit display for links
    updateLinks = function() {
      link = linksG.selectAll("line.link").data(curLinksData, function(d) {
        return d.source.id + "_" + d.target.id;
      });
      link.enter().append("line").attr("class", "link").attr("stroke", "#ddd").attr("x1", function(d) {
        return d.source.x;
      }).attr("y1", function(d) {
        return d.source.y;
      }).attr("x2", function(d) {
        return d.target.x;
      }).attr("y2", function(d) {
        return d.target.y;
      }).style("stroke-width", function(d) {
        return d.weightage;
      });
      
      return link.exit().remove();
    };

    // enter/exit display for linklabels
    updateLinkLabels = function() {
      linkLabel = linksG.selectAll(".linkLabel").data(curLinksData, function(d) {
        return d.source.id + "_" + d.target.id;
      });
      linkLabel.enter().append("text")
        .attr("class", "linkLabel")
        .attr("fill", "#ddd")
        .style("font", "normal 8px Arial")
        .attr("x", function(d) {
          if (d.target.x > d.source.x) { return (d.source.x + (d.target.x - d.source.x)/2); }
          else { return (d.target.x + (d.source.x - d.target.x)/2); }
      })
            .attr("y", function(d) {
          if (d.target.y > d.source.y) { return (d.source.y + (d.target.y - d.source.y)/2); }
          else { return (d.target.y + (d.source.y - d.target.y)/2); }
      })
        .text(function(d) {return d.commoneventcount;});

        return linkLabel.exit().remove();
    }

    // set layout
    setLayout = function() {
      return force.on("tick", forceTick).charge(-300).linkDistance(150);
    };

    // switches popularity filter option
    setPopularityFilter = function(newFilter) {
      return popularityFilter = newFilter;
    };

    // switches industry filter option
    setIndustryFilter = function(newFilter) {
      return industryFilter = newFilter;
    };

    // tick function for force directed layout
    forceTick = function(e) {
      node.attr("cx", function(d) {
        return d.x;
      }).attr("cy", function(d) {
        return d.y;
      });

      nodeLabel.attr("x", function(d) {
        return d.x;
      }).attr("y", function(d) {
        return d.y;
      });

      link.attr("x1", function(d) {
        return d.source.x;
      }).attr("y1", function(d) {
        return d.source.y;
      }).attr("x2", function(d) {
        return d.target.x;
      }).attr("y2", function(d) {
        return d.target.y;
      });

      linkLabel.attr("x", function(d) {
          if (d.target.x > d.source.x) { return (d.source.x + (d.target.x - d.source.x)/2); }
          else { return (d.target.x + (d.source.x - d.target.x)/2); }
      })
            .attr("y", function(d) {
          if (d.target.y > d.source.y) { return (d.source.y + (d.target.y - d.source.y)/2); }
          else { return (d.target.y + (d.source.y - d.target.y)/2); }
      })
    };

    // Helper function that returns stroke color for particular node.
    strokeFor = function(d) {
      return d3.rgb(nodeColors(d.industry)).darker().toString();
    };

    // Mouseover tooltip function
    showDetails = function(d, i) {
      var content;
      content = '<p class="main">' + "Name: " + d.name + '</span></p>';
      content += '<hr class="tooltip-hr">';
      content += '<p class="main">' + "Company: " + d.company + '</span></p>';
      content += '<hr class="tooltip-hr">';
      content += '<p class="main">' + "Department: " + d.department + '</span></p>';
      content += '<hr class="tooltip-hr">';
      content += '<p class="main">' + "Industry: " + d.industry + '</span></p>';
      content += '<hr class="tooltip-hr">';
      content += '<p class="main">' + "Position: " + d.position + '</span></p>';
      content += '<hr class="tooltip-hr">';
      content += '<p class="main">' + "TA: " + d.technicalarea + '</span></p>';
      content += '<hr class="tooltip-hr">';
      content += '<p class="main">' + "Number of events: " + d.eventcount + '</span></p>';
      tooltip.showTooltip(content, d3.event);
      
      // higlight connected links
      if (link) {
        link.attr("stroke", function(l) {
          if (l.source === d || l.target === d) {
            return "#555";
          } else {
            return "#ddd";
          }
        }).attr("stroke-opacity", function(l) {
          if (l.source === d || l.target === d) {
            return 0.7;
          } else {
            return 0.5;
          }
        });
      }

      // higlight common event counts
      if (linkLabel) {
        linkLabel.attr("fill", function(l) {
          if (l.source === d || l.target === d) {
            return "black";
          } else {
            return "#ddd";
          }
        }).style("font", function(l) {
          if (l.source === d || l.target === d) {
            return "bold 16px Arial";
          } else {
            return "normal 8px Arial";
          }
        });
      }

      // highlight neighboring nodes
      // watch out - don't mess with node if search is currently matching
      node.style("stroke", function(n) {
        if (n.searched || neighboring(d, n)) {
          return "#555";
        } else {
          return strokeFor(n);
        }
      }).style("stroke-width", function(n) {
        if (n.searched || neighboring(d, n)) {
          return 2.0;
        } else {
          return 1.0;
        }
      });
      // highlight the node being moused over
      return d3.select(this).style("stroke", "black").style("stroke-width", 2.0);
    };

    // Mouseout function
    hideDetails = function(d, i) {
      tooltip.hideTooltip();
      // watch out - don't mess with node if search is currently matching
      node.style("stroke", function(n) {
        if (!n.searched) {
          return strokeFor(n);
        } else {
          return "#555";
        }
      }).style("stroke-width", function(n) {
        if (!n.searched) {
          return 1.0;
        } else {
          return 2.0;
        }
      });

      if (link) {
        link.attr("stroke", "#ddd").attr("stroke-opacity", 1.0);
      }

      if (linkLabel){
        linkLabel.attr("fill", "#ddd").style("font", "normal 8px Arial");
      }

    };
    return network;
  };

  // Activate selector button
  activate = function(group, link) {
    d3.selectAll("#" + group + " a").classed("active", false);
    return d3.select("#" + group + " #" + link).classed("active", true);
  };

  $(function() {
    var myNetwork;
    myNetwork = Network();

    // Popularity Filter
    d3.selectAll("#popularityfilter a").on("click", function(d) {
      var newFilter;
      newFilter = d3.select(this).attr("id");
      activate("popularityfilter", newFilter);
      return myNetwork.togglePopularityFilter(newFilter);
    });

    // Industry Filter
    $("#industry_select").on("change", function(e) {
      var newFilter;
      newFilter = $(this).val();
      activate("industryfilter", newFilter);
      return myNetwork.toggleIndustryFilter(newFilter);
    });

    // Search Function
    $("#search").keyup(function() {
      var searchTerm;
      searchTerm = $(this).val();
      return myNetwork.updateSearch(searchTerm);
    });

    // Show Name checkbox
    /*$("#name_checkbox").on("click", function(e) {
      var newChecker;
      newChecker = $(this).checked;
      return myNetwork.showName(newChecker);
    });*/

    // Select which json file to use (not used)
    $("#data_select").on("change", function(e) {
      var dataFile;
      dataFile = $(this).val();
      return d3.json("data/" + dataFile, function(json) {
        return myNetwork.updateData(json);
      });
    });

    // Use default json file (currently network.json)
    return d3.json("data/network.json", function(json) {
      return myNetwork("#network", json);
    });
  });

}).call(this);