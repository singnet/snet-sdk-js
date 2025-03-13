import { useState } from 'react';
import '../FilterModels/styles.css'; 
import { serviceStatus } from 'snet-sdk-web/core/src/constants/TrainingConstants';

const FilterModels = ({ trainingMetadata, onFilterApply }) => {
    const [filters, setFilters] = useState({
        grpcMethod: '',
        serviceName: '',
        name: '',
        statuses: [],
        isPublic: null,
        createdByAddress: '',
        pageSize: 10,
        page: 0,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (e) => {
        const { value, checked } = e.target;
        setFilters(prev => ({
            ...prev,
            statuses: checked
                ? [...prev.statuses, parseInt(value)]
                : prev.statuses.filter(status => status !== parseInt(value))
        }));
    };

    const handleIsPublicChange = (e) => {
        const { value } = e.target;
        setFilters(prev => ({ ...prev, isPublic: value === 'null' ? null : value === 'true' }));
    };

    const handleApply = () => {
        onFilterApply(filters);
    };

    return (
        <div className="filters-container">
            <div className="filter-group">
                <label>GRPC Method:</label>
                <select name="grpcMethod" value={filters.grpcMethod} onChange={handleChange}>
                    <option value="">Select GRPC Method</option>
                    {trainingMetadata.trainingServicesAndMethods[trainingMetadata.grpcServiceName]?.map(method => (
                        <option key={method} value={method}>{method}</option>
                    ))}
                </select>
            </div>
            <div className="filter-group">
                <label>Service Name:</label>
                <select name="serviceName" value={filters.serviceName} onChange={handleChange}>
                    <option value="">Select Service Name</option>
                    {Object.keys(trainingMetadata.trainingServicesAndMethods).map(service => (
                        <option key={service} value={service}>{service}</option>
                    ))}
                </select>
            </div>
            <div className="filter-group">
                <label>Name:</label>
                <input type="text" name="name" value={filters.name} onChange={handleChange} />
            </div>
            <div className="filter-group">
                <label>Statuses:</label>
                {Object.entries(serviceStatus).map(([key, value]) => (
                    <label key={key}>
                        <input
                            type="checkbox"
                            value={key}
                            checked={filters.statuses.includes(parseInt(key))}
                            onChange={handleStatusChange}
                        />
                        {value}
                    </label>
                ))}
            </div>
            <div className="filter-group">
                <label>Is Public:</label>
                <select name="isPublic" value={filters.isPublic} onChange={handleIsPublicChange}>
                    <option value="null">Null</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            </div>
            <div className="filter-group">
                <label>Created By Address:</label>
                <input type="text" name="createdByAddress" value={filters.createdByAddress} onChange={handleChange} />
            </div>
            <div className="filter-group">
                <label>Page Size:</label>
                <input type="number" name="pageSize" value={filters.pageSize} onChange={handleChange} />
            </div>
            <div className="filter-group">
                <label>Page:</label>
                <input type="number" name="page" value={filters.page} onChange={handleChange} />
            </div>
            <button onClick={handleApply}>Get All Models</button>
        </div>
    );
};

export default FilterModels;