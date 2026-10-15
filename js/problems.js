/* Problem sets. One spec line per problem: A=(left,right), C=(left,right), then one or more steps,
   transform1=(left move,right move), transform2=(...), applied in order.
   answers holds the correct option (1-4) for each problem, in the same order.
   Each problem's option images come from <dir>problem_N.png. */
var SETS = [
  {
    name: "Set 1",
    dir: "img/set1/",
    specs: [
      "Problem 1: A=(ellipse,diamond), C=(circle,heart), transform1=(fill(empty),fill(yellow))",
      "Problem 2: A=(heart,star), C=(circle,diamond), transform1=(scale_down,shear_vertical)",
      "Problem 3: A=(circle,triangle), C=(star,hexagon), transform1=(fill(blue),fill(green))",
      "Problem 4: A=(rectangle,pentagon), C=(triangle,plus), transform1=(reflect,scale_down)",
      "Problem 5: A=(hexagon,plus), C=(star,rectangle), transform1=(shear_vertical,shear_horizontal)",
      "Problem 6: A=(heart,circle), C=(triangle,plus), transform1=(rotate_counterclockwise,shear_horizontal)",
      "Problem 7: A=(heart,pentagon), C=(plus,star), transform1=(rotate_counterclockwise,shear_horizontal)",
      "Problem 8: A=(star,hexagon), C=(diamond,arrow), transform1=(fill(yellow),fill(yellow))",
      "Problem 9: A=(circle,ellipse), C=(hexagon,plus), transform1=(fill(yellow),fill(yellow))",
      "Problem 10: A=(heart,circle), C=(diamond,hexagon), transform1=(scale_up,shear_horizontal)"
    ],
    answers: [2, 4, 2, 4, 3, 4, 2, 3, 4, 1]
  },
  {
    name: "Set 2",
    dir: "img/set2/",
    specs: [
      "Problem 1: A=(heart,circle), C=(pentagon,diamond), transform1=(rotate_counterclockwise,scale_up), transform2=(fill(red),fill(yellow))",
      "Problem 2: A=(diamond,star), C=(hexagon,plus), transform1=(rotate_counterclockwise,shear_horizontal), transform2=(fill(yellow),fill(red))",
      "Problem 3: A=(rectangle,diamond), C=(arrow,triangle), transform1=(shear_vertical,rotate_clockwise), transform2=(fill(red),fill(empty))",
      "Problem 4: A=(star,hexagon), C=(circle,arrow), transform1=(scale_down,shear_horizontal), transform2=(fill(red),fill(empty))",
      "Problem 5: A=(plus,diamond), C=(triangle,pentagon), transform1=(scale_down,shear_vertical), transform2=(fill(green),fill(blue))",
      "Problem 6: A=(ellipse,rectangle), C=(triangle,circle), transform1=(scale_up,rotate_counterclockwise), transform2=(fill(green),fill(red))",
      "Problem 7: A=(circle,triangle), C=(rectangle,diamond), transform1=(scale_up,shear_horizontal), transform2=(fill(blue),fill(empty))",
      "Problem 8: A=(circle,star), C=(arrow,diamond), transform1=(reflect,shear_vertical), transform2=(fill(empty),fill(blue))",
      "Problem 9: A=(diamond,circle), C=(star,arrow), transform1=(reflect,shear_vertical), transform2=(fill(red),fill(empty))",
      "Problem 10: A=(star,circle), C=(hexagon,diamond), transform1=(reflect,shear_horizontal), transform2=(fill(yellow),fill(red))"
    ],
    answers: [1, 4, 3, 4, 2, 1, 4, 2, 4, 4]
  }
];
