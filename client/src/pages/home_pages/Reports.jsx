import React, { useState, useEffect } from 'react';
import './css/reports.css';

const Reports = () => {
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
    categoryId: ''
  });
  const [format, setFormat] = useState('CSV');
  const [filePreview, setFilePreview] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch('https://api.devsis.ru/inex/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, []);

  const handleDownload = (format) => {
    setFormat(format);
    const token = localStorage.getItem('token');
    
    fetch('https://api.devsis.ru/inex/download-report', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...filters, format })
    })
      .then(response => response.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transactions.${format.toLowerCase()}`;
        link.click();
      })
      .catch(err => console.error(err));
  };

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);

      if (selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
        setFilePreview("Предпросмотр для Excel файлов невозможен.");
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const contents = e.target.result;
          setFilePreview(contents);
        };
        reader.readAsText(selectedFile);
      }
    }
  };

  const handleFileSubmit = () => {
    if (!filePreview) {
      alert("Пожалуйста, выберите файл для загрузки.");
      return;
    }
  
    const parsedData = parseFileToJson(filePreview);
  console.log(parsedData)
    const token = localStorage.getItem('token');
    
    fetch('https://api.devsis.ru/inex/upload-report', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parsedData)
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Данные успешно загружены!");
        } else {
          alert("Ошибка при загрузке данных.");
        }
      })
      .catch(err => {
        console.error(err);
        alert("Ошибка при загрузке данных.");
      });
  };
  
  const parseFileToJson = (fileContent) => {
    const rows = fileContent.split('\n');
    
    const parsedData = rows
      .map(row => {
        const columns = row.split(',');
  
        if (columns.length < 6) return null;
  
        const rawType = columns[1]?.replace('Тип:', '').trim();
        const rawAmount = columns[2]?.replace('Сумма:', '').trim();
        const rawDescription = columns[3]?.replace('Описание:', '').trim();
        const rawCategory = columns[4]?.replace('Категория:', '').trim();
        const rawDate = columns[5]?.replace('Дата:', '').trim();
  
        const [day, month, year] = rawDate.split('/');
        const formattedDate = `${year}-${month}-${day}`;
  
        return {
          type: rawType,
          amount: parseFloat(rawAmount),
          description: rawDescription,
          category: rawCategory,
          date: formattedDate
        };
      })
      .filter(row => row !== null);
  
    return parsedData;
  };
   

  return (
    <div className="reports-container">
      <h2>Работа с Отчетами</h2>
      <form className="filters-form">
        <div className="form-group">
          <label>Тип:</label>
          <select
            className="select-input"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Все</option>
            <option value="income">Доход</option>
            <option value="expense">Расход</option>
          </select>
        </div>
        <div className="form-group">
          <label>Дата от:</label>
          <input
            className="date-input2"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Дата до:</label>
          <input
            className="date-input2"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Категория:</label>
          <select
            className="select-input"
            value={filters.categoryId}
            onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
          >
            <option value="">Все категории</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </form>

      <div className="buttons-container">
        <button className="download-btn" onClick={() => handleDownload('CSV')}>Скачать в CSV</button>
        <button className="download-btn" onClick={() => handleDownload('JSON')}>Скачать в JSON</button>
        <button className="download-btn" onClick={() => handleDownload('TXT')}>Скачать в TXT</button>
        <button className="download-btn" onClick={() => handleDownload('PDF')}>Скачать в PDF</button>
        <button className="download-btn" onClick={() => handleDownload('EXCEL')}>Скачать в EXCEL</button>
      </div>

      <div className="upload-container">
        <input type="file" accept=".csv,.txt,.xlsx" onChange={handleFileUpload} />
        <div className="file-preview">
          <h3>Предпросмотр файла:</h3>
          <pre>{filePreview}</pre>
        </div>
        <button className="upload-btn" onClick={handleFileSubmit}>Загрузить</button>
      </div>

      <div className="file-format-examples">
        <h3>Примеры правильных форматов файлов</h3>
        
        <div className="format-example">
          <h4>CSV формат</h4>
          <p><strong>Пример:</strong></p>
          <pre>
            №,Тип,Сумма,Описание,Категория,Дата<br />
            1,Доход,1000,Заработная плата,Работа,01/01/2025<br />
            2,Расход,200,Продукты,Питание,02/01/2025
          </pre>
          <p>Каждое значение разделяется запятой (`,`).</p>
        </div>

        <div className="format-example">
          <h4>TXT формат</h4>
          <p><strong>Пример:</strong></p>
          <pre>
            №: 1, Тип: Доход, Сумма: 1000, Описание: Заработная плата, Категория: Работа, Дата: 01/01/2025<br />
            №: 2, Тип: Расход, Сумма: 200, Описание: Продукты, Категория: Питание, Дата: 02/01/2025
          </pre>
          <p>Каждое поле разделяется запятой.</p>
        </div>

        <div className="format-example">
          <h4>EXCEL формат</h4>
          <p><strong>Пример:</strong></p>
          <pre>
            № | Тип   | Сумма | Описание        | Категория | Дата<br />
            1  | Доход | 1000 | Заработная плата | Работа    | 01/01/2025<br />
            2  | Расход| 200  | Продукты        | Питание   | 02/01/2025
          </pre>
          <p>Каждое поле разделяется табуляцией или запятой.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
