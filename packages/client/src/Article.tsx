import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { useParams } from 'react-router-dom';
import Comments from './Comments';

function Article() {
  let { id } = useParams();
  const {data} = useQuery(gql`
    query getArticle($id: ID!, $last: Int = 3, $before: ID) {
      article(id: $id) {
        id
        title
        comments(last: $last, before: $before) {
          count
          pageInfo {
            startCursor
            hasPreviousPage
          }
          edges {
            cursor
            node {
              id
              content
            }
          }
        }
      }
    }
  `, {
    variables: {id},
    returnPartialData: true,
  });
  return (
    <>
      {data?.article?.title && <div>Title: {data.article.title}</div>}
      {data?.article?.comments && <div>Loaded comments: {data.article.comments.edges?.length ?? 0}</div>}
      {data?.article?.comments && <Comments articleId={id} />}
    </>
  );
}

export default Article;
