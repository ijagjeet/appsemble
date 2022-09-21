import {
  Button,
  Checkbox,
  Content,
  FileUpload,
  ModalCard,
  SimpleForm,
  SimpleFormError,
  SimpleFormField,
  SimpleModalFooter,
  Table,
  Title,
  useConfirmation,
  useData,
  useMessages,
  useMeta,
  useToggle,
} from '@appsemble/react-components';
import { PaginationNavigator } from '@appsemble/react-components/PaginationNavigator';
import { Asset } from '@appsemble/types';
import { compareStrings, normalize } from '@appsemble/utils';
import axios from 'axios';
import { ChangeEvent, ReactElement, useCallback, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';

import { AsyncDataView } from '../../../../components/AsyncDataView/index.js';
import { useApp } from '../index.js';
import { AssetRow } from './AssetRow/index.js';
import styles from './index.module.css';
import { messages } from './messages.js';

interface FormValues {
  file: File;
  name: string;
}

const defaultFormValues: FormValues = {
  file: undefined,
  name: '',
};

export function AssetsPage(): ReactElement {
  useMeta(messages.title);

  const { app } = useApp();
  const { formatMessage } = useIntl();
  const { pathname: routeUrl } = useLocation();
  const push = useMessages();

  const { searchParams } = new URL(window.location.href);
  const offset = searchParams.get('offset') == null ? 0 : Number(searchParams.get('offset'));
  const limit =
    searchParams.get('limit') === 'none'
      ? Number.POSITIVE_INFINITY
      : searchParams.get('limit') == null
      ? 10
      : Number(searchParams.get('limit'));
  const rowsPerPage = limit;
  const page = limit === Number.POSITIVE_INFINITY ? 1 : Math.floor(offset / limit) + 1;

  const resultCount = useData<number>(`/api/apps/${app.id}/assets/$count`);
  const assetsResult = useData<Asset[]>(
    `/api/apps/${app.id}/assets?$skip=${offset}${
      limit === Number.POSITIVE_INFINITY ? '' : `&$top=${limit}`
    }`,
  );
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const dialog = useToggle();

  const { setData } = assetsResult;
  const count = resultCount.data;

  const updatePagination = useCallback(
    (newCount: number) => {
      const newPage =
        rowsPerPage === Number.POSITIVE_INFINITY
          ? 1
          : page >= Math.ceil(newCount / rowsPerPage)
          ? Math.ceil(newCount / rowsPerPage)
          : page;
      if (rowsPerPage === Number.POSITIVE_INFINITY) {
        searchParams.set('limit', 'none');
        searchParams.set('offset', '0');
      } else {
        searchParams.set('limit', String(rowsPerPage));
        searchParams.set('offset', String((newPage - 1) * rowsPerPage));
      }
      window.history.replaceState({}, '', `${routeUrl}?${searchParams}`);
      resultCount.refresh();
      assetsResult.refresh();
    },
    [assetsResult, page, resultCount, routeUrl, rowsPerPage, searchParams],
  );

  const submitAsset = useCallback(
    async ({ file, name }: FormValues) => {
      const formData = new FormData();
      formData.append('file', file);
      if (name) {
        formData.append('name', normalize(name));
      }
      const { data } = await axios.post<Asset>(`/api/apps/${app.id}/assets`, formData);

      push({ color: 'success', body: formatMessage(messages.uploadSuccess, { id: data.id }) });

      setData((assets) => [...assets, data]);
      updatePagination(count + 1);
      dialog.disable();
    },
    [app.id, count, dialog, formatMessage, push, setData, updatePagination],
  );

  const onDelete = useConfirmation({
    title: (
      <FormattedMessage
        {...messages.deleteWarningTitle}
        values={{ amount: selectedAssets.length }}
      />
    ),
    body: (
      <FormattedMessage values={{ amount: selectedAssets.length }} {...messages.deleteWarning} />
    ),
    cancelLabel: <FormattedMessage {...messages.cancel} />,
    confirmLabel: <FormattedMessage {...messages.delete} />,
    color: 'danger',
    async action() {
      await axios.delete(`/api/apps/${app.id}/assets`, { data: selectedAssets });

      push({
        body: formatMessage(messages.deleteSuccess, {
          amount: selectedAssets.length,
          assets: selectedAssets.sort(compareStrings).join(', '),
        }),
        color: 'info',
      });
      setData((assets) => assets.filter((asset) => !selectedAssets.includes(String(asset.id))));
      setSelectedAssets([]);
      updatePagination(count - selectedAssets.length);
    },
  });

  const onAssetCheckboxClick = useCallback(
    (event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
      const id = event.currentTarget.name.replace(/^asset/, '');

      setSelectedAssets((assets) => (checked ? [...assets, id] : assets.filter((a) => a !== id)));
    },
    [],
  );

  const onSelectAll = useCallback(() => {
    setSelectedAssets((selected) =>
      selected.length === assetsResult.data?.length
        ? []
        : assetsResult.data.map((asset) => asset.id),
    );
  }, [assetsResult]);

  const onPageChange = useCallback(
    (updatedPage: number) => {
      setSelectedAssets([]);
      if (rowsPerPage === Number.POSITIVE_INFINITY) {
        searchParams.set('limit', 'none');
        searchParams.set('offset', '0');
      } else {
        searchParams.set('limit', String(rowsPerPage));
        searchParams.set('offset', String((updatedPage - 1) * rowsPerPage));
      }
      window.history.replaceState({}, '', `${routeUrl}?${searchParams}`);
    },
    [routeUrl, rowsPerPage, searchParams],
  );

  const onRowsPerPageChange = useCallback(
    (updatedRowsPerPage: number) => {
      setSelectedAssets([]);
      if (updatedRowsPerPage === Number.POSITIVE_INFINITY) {
        searchParams.set('limit', 'none');
        searchParams.set('offset', '0');
      } else {
        searchParams.set('limit', String(updatedRowsPerPage));
        const newOffset = offset - (offset % updatedRowsPerPage);
        searchParams.set('offset', String(newOffset));
      }
      window.history.replaceState({}, '', `${routeUrl}?${searchParams}`);
    },
    [offset, routeUrl, searchParams],
  );

  return (
    <>
      <Title>
        <FormattedMessage {...messages.title} />
      </Title>
      <div className="buttons">
        <Button color="primary" icon="upload" onClick={dialog.enable}>
          <FormattedMessage {...messages.uploadButton} />
        </Button>
        <Button
          color="danger"
          disabled={selectedAssets.length === 0}
          icon="trash-alt"
          onClick={onDelete}
        >
          <FormattedMessage {...messages.deleteButton} values={{ amount: selectedAssets.length }} />
        </Button>
      </div>
      <AsyncDataView
        emptyMessage={<FormattedMessage {...messages.empty} />}
        errorMessage={<FormattedMessage {...messages.error} />}
        loadingMessage={<FormattedMessage {...messages.loading} />}
        result={assetsResult}
      >
        {(assets) => (
          <>
            <Table>
              <thead>
                <tr>
                  <th>
                    <Checkbox
                      className={`pr-2 is-inline-block ${styles.boolean} `}
                      indeterminate={
                        selectedAssets.length
                          ? selectedAssets.length !== assetsResult.data?.length
                          : null
                      }
                      name="select-all"
                      onChange={onSelectAll}
                      value={selectedAssets.length === assetsResult.data?.length}
                    />
                    <span className="is-inline-block">
                      <FormattedMessage {...messages.actions} />
                    </span>
                  </th>
                  <th>
                    <FormattedMessage {...messages.id} />
                  </th>
                  <th>
                    <FormattedMessage {...messages.resource} />
                  </th>
                  <th>
                    <FormattedMessage {...messages.mime} />
                  </th>
                  <th>
                    <FormattedMessage {...messages.filename} />
                  </th>
                  <th>
                    <FormattedMessage {...messages.preview} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <AssetRow
                    asset={asset}
                    isSelected={selectedAssets.includes(asset.id)}
                    key={asset.id}
                    onSelect={onAssetCheckboxClick}
                  />
                ))}
              </tbody>
            </Table>
            <PaginationNavigator
              count={count}
              onPageChange={onPageChange}
              onRowsPerPageChange={onRowsPerPageChange}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[10, 25, 100, 500, Number.POSITIVE_INFINITY]}
            />
          </>
        )}
      </AsyncDataView>
      <ModalCard
        component={SimpleForm}
        defaultValues={defaultFormValues}
        footer={
          <SimpleModalFooter
            cancelLabel={<FormattedMessage {...messages.cancel} />}
            onClose={dialog.disable}
            submitLabel={<FormattedMessage {...messages.upload} />}
          />
        }
        isActive={dialog.enabled}
        onClose={dialog.disable}
        onSubmit={submitAsset}
        resetOnSuccess
        title={<FormattedMessage {...messages.uploadTitle} />}
      >
        <Content>
          <SimpleFormError>{() => <FormattedMessage {...messages.uploadError} />}</SimpleFormError>
          <SimpleFormField
            className={`${styles.filePicker} has-text-centered`}
            component={FileUpload}
            fileButtonLabel={<FormattedMessage {...messages.chooseFile} />}
            fileLabel={<FormattedMessage {...messages.noFile} />}
            formComponentClassName="has-text-centered"
            label={<FormattedMessage {...messages.file} />}
            name="file"
            required
          />
          <SimpleFormField
            addonLeft={
              <label className="button is-static" htmlFor="name">
                /api/apps/{app.id}/assets/
              </label>
            }
            help={<FormattedMessage {...messages.nameDescription} />}
            label={<FormattedMessage {...messages.name} />}
            name="name"
            preprocess={(value) => normalize(value, false)}
          />
        </Content>
      </ModalCard>
    </>
  );
}
