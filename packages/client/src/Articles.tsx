import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { Link } from 'react-router-dom';

const getArticlesQuery = gql`
  query getArticles {
    articles {
      id
      title
    }
  }
`;

function Articles() {
  const {data} = useQuery(getArticlesQuery);

  return (
    <>
      {data?.articles && <div>{data.articles.map(({id, title}: any) => (
        <div key={id}>
          <Link to={`/${id}`}>{title}</Link>
        </div>
      ))}</div>}
    </>
  );
}

export default Articles;
