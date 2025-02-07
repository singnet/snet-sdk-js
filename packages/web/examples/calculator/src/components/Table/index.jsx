import './styles.css';

const Table = ({tableData}) => {
    return (
        <table className='table'>
            <tbody>
                {tableData.map((modelRow) => (
                    <tr key={modelRow.title}>
                        <th scope='row'>{modelRow.title}</th>
                        <td>{modelRow.value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default Table;