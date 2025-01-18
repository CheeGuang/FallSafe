// Bar Chart Configuration
const barCtx = document.getElementById('barChart').getContext('2d');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels: ['Confidence Level 1', 'Confidence Level 2', 'Confidence Level 3', 'Confidence Level 4'],
    datasets: [
      {
        label: 'Confidence Levels by Activity',
        data: [85, 70, 55, 40], // Example data (To be updated with actual data dynamically)
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// Radar Chart Configuration
const radarCtx = document.getElementById('radarChart').getContext('2d');
new Chart(radarCtx, {
  type: 'radar',
  data: {
    labels: ['Walking', 'Climbing Stairs', 'Carrying Items', 'Bending'],
    datasets: [
      {
        label: 'User Confidence Levels',
        data: [90, 70, 60, 50], // Example data
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff'
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      r: {
        beginAtZero: true
      }
    }
  }
});