import { cogsToAgix, tokenName } from "../../helperFunctions/priceHelpers";
import Loader from "../Loader";
import "./styles.css";

const ServiceInfo = ({serviceClient}) => {
    if (!serviceClient) {
        return <div className="loader"><Loader isLoading={true} /></div>
    }
    const metadata = serviceClient._metadata;

    return (
        <div className="service-info-container">
            <div className="main-service-info">
                {metadata.media.map(image =>
                    <div key={image.url} className="service-image-container">
                        <img src={image.url} alt={image.altText} />
                    </div>
                )}
                <h2>{metadata.display_name}</h2>
            </div>
            <div className="groups-container">
            {metadata.groups.map(group =>
                <div key={group.group_id} className="service-image-container">
                    <h3>{group.group_name}:</h3>
                    {group.pricing.map(price =>
                        <table className="pricing-info-table" key={price.price_model}>
                            <tbody>
                                <tr>
                                    <th scope="row">free calls</th>
                                    <td>{group.free_calls}</td>
                                </tr>
                                <tr>
                                    <th scope="row">pricing model</th>
                                    <td>{price.price_model}</td>
                                </tr>
                                <tr>
                                    <th scope="row">is default</th>
                                    <td>{String(price.default)}</td>
                                </tr>
                                <tr>
                                    <th scope="row">price</th>
                                    <td>{cogsToAgix(price.price_in_cogs)}{tokenName}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            )}
            </div>
        </div>
    )
}

export default ServiceInfo;